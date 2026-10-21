import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asService, asUser, bootstrapSuperAdmin, createDb, failure, makeUser, rows, setRole, uuid, type Db,
} from './harness';

let db: Db;
let owner: string;

beforeAll(async () => {
  db = await createDb();
  owner = await bootstrapSuperAdmin(db);
});
afterAll(async () => {
  await db.close();
});

const access = async (uid: string) =>
  (await asUser(db, uid, () => db.query<{ a: any }>(`select public.my_access() as a`))).rows[0].a;

describe('account provisioning', () => {
  it('creates a profile and a plain student role for every new auth user', async () => {
    const uid = await makeUser(db, 'Asha Rao', 'asha@example.com', { avatar_url: 'https://lh3.googleusercontent.com/a/x' });
    const a = await access(uid);
    expect(a.role).toBe('student');
    expect(a.permissions).toEqual(['resources.read']);
    expect(a.full_name).toBe('Asha Rao');
    expect(a.avatar_url).toBe('https://lh3.googleusercontent.com/a/x');
  });

  it('ignores anything in signup metadata that looks like a role or an admin email', async () => {
    const uid = await makeUser(db, 'Mallory', 'admin@example.com', { role: 'super_admin', roles: ['super_admin'], is_admin: true });
    expect((await access(uid)).role).toBe('student');
  });

  it('drops non-https avatar URLs', async () => {
    const uid = await makeUser(db, 'Eve', undefined, { avatar_url: 'javascript:alert(1)' });
    expect((await access(uid)).avatar_url).toBeNull();
  });
});

describe('students cannot escalate', () => {
  it('cannot write user_roles / user_permissions / permissions directly', async () => {
    const uid = await makeUser(db, 'student');
    for (const sql of [
      `update public.user_roles set role_id = 'super_admin' where user_id = '${uid}'`,
      `update public.user_roles set role_id = 'content_admin'`,
      `insert into public.user_roles (user_id, role_id) values ('${uuid()}', 'super_admin')`,
      `delete from public.user_roles`,
      `insert into public.user_permissions (user_id, permission_id) select '${uid}', id from public.permissions`,
      `insert into public.role_permissions (role_id, permission_id) select 'student', id from public.permissions`,
      `update public.permissions set delegable = true`,
      `update public.roles set assignable = true`,
    ]) {
      expect(await failure(asUser(db, uid, () => db.query(sql)))).toMatch(/permission denied/i);
    }
    expect((await access(uid)).role).toBe('student');
  });

  it('can edit their name but not status, email or id on their profile', async () => {
    const uid = await makeUser(db, 'Rina');
    await asUser(db, uid, () => db.query(`update public.profiles set full_name = 'Rina K' where id = $1`, [uid]));
    expect((await access(uid)).full_name).toBe('Rina K');

    for (const col of ["account_status = 'suspended'", "email = 'x@y.com'", `id = '${uuid()}'`, "avatar_url = 'https://evil.example/x'"]) {
      expect(await failure(asUser(db, uid, () => db.query(`update public.profiles set ${col} where id = $1`, [uid])))).toMatch(/permission denied/i);
    }
  });

  it("cannot read or edit another student's profile", async () => {
    const a = await makeUser(db, 'a');
    const b = await makeUser(db, 'b');
    const seen = await asUser(db, a, () => db.query(`select id from public.profiles`));
    expect(seen.rows.map((r: any) => r.id)).toEqual([a]);
    const updated = await asUser(db, a, () => db.query(`update public.profiles set full_name = 'hacked' where id = $1`, [b]));
    expect(updated.affectedRows).toBe(0);
  });

  it('is refused by every role/permission/settings/transfer RPC', async () => {
    const uid = await makeUser(db, 'student');
    const other = await makeUser(db, 'other');
    const calls = [
      [`select public.set_user_role($1, 'content_admin')`, [other]],
      [`select public.set_user_role($1, 'super_admin')`, [uid]],
      [`select public.grant_user_permission($1, 'contributions.approve')`, [uid]],
      [`select public.revoke_user_permission($1, 'resources.read')`, [other]],
      [`select public.set_account_status($1, 'suspended', 'x')`, [other]],
      [`select public.transfer_super_admin($1, 'student', 'TRANSFER SUPER ADMIN')`, [uid]],
      [`select public.set_app_setting('allowed_email_domains', '[]'::jsonb)`, []],
      [`select public.create_resource($1,'Some title here','d','notes','https://example.org/a.pdf',null)`, [uuid()]],
      [`select public.delete_resource($1)`, [uuid()]],
      [`select public.claim_contribution($1)`, [uuid()]],
      [`select public.approve_contribution($1)`, [uuid()]],
    ] as const;
    for (const [sql, params] of calls) {
      expect(await failure(asUser(db, uid, () => db.query(sql, [...params])))).toMatch(/forbidden/);
    }
  });

  it('cannot call the bootstrap function', async () => {
    const uid = await makeUser(db, 'wannabe');
    expect(await failure(asUser(db, uid, () => db.query(`select public.bootstrap_super_admin($1)`, [uid])))).toMatch(/permission denied/i);
  });
});

describe('single super admin', () => {
  it('can only be bootstrapped once, by the service role', async () => {
    const second = await makeUser(db, 'second');
    expect(await failure(asService(db, () => db.query(`select public.bootstrap_super_admin($1)`, [second])))).toMatch(/conflict/);
    expect((await access(second)).role).toBe('student');
  });

  it('is enforced by the database even for a superuser writing SQL directly', async () => {
    const second = await makeUser(db, 'sneaky');
    const msg = await failure(db.query(`update public.user_roles set role_id = 'super_admin' where user_id = $1`, [second]));
    expect(msg).toMatch(/user_roles_single_super_admin|duplicate key/);
  });

  it('cannot be removed without a transfer', async () => {
    expect(await failure(db.query(`delete from public.user_roles where role_id = 'super_admin'`))).toMatch(/super_admin_required/);
    expect(await failure(db.query(`update public.user_roles set role_id = 'student' where role_id = 'super_admin'`))).toMatch(/super_admin_required/);
    expect(await failure(db.query(`delete from auth.users where id = $1`, [owner]))).toMatch(/super_admin_required/);
    const [row] = await rows(db, `select count(*)::int as n from public.user_roles where role_id = 'super_admin'`);
    expect(row).toEqual({ n: 1 });
  });

  it('cannot be assigned, changed or suspended through the normal role RPCs', async () => {
    const target = await makeUser(db, 'target');
    expect(await failure(asUser(db, owner, () => db.query(`select public.set_user_role($1, 'super_admin')`, [target])))).toMatch(/forbidden/);
    expect(await failure(asUser(db, owner, () => db.query(`select public.set_user_role($1, 'student')`, [owner])))).toMatch(/forbidden/);

    const mod = await makeUser(db, 'mod');
    await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'file_moderator')`, [mod]));
    await asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'users.suspend')`, [mod]));
    expect(await failure(asUser(db, mod, () => db.query(`select public.set_account_status($1, 'suspended', 'nope')`, [owner])))).toMatch(/forbidden/);
  });

  it('moves only through an explicit, confirmed, audited, atomic transfer', async () => {
    // A fresh database so this test owns the super admin seat.
    const iso = await createDb();
    try {
      const old = await bootstrapSuperAdmin(iso, 'old-owner');
      const next = await makeUser(iso, 'new-owner');
      await asUser(iso, next, () => iso.query(`select 1`)); // sanity: normal student

      expect(await failure(asUser(iso, old, () => iso.query(`select public.transfer_super_admin($1, 'content_admin', 'yes')`, [next])))).toMatch(/invalid_input/);
      expect(await failure(asUser(iso, old, () => iso.query(`select public.transfer_super_admin($1, 'super_admin', 'TRANSFER SUPER ADMIN')`, [next])))).toMatch(/invalid_input/);
      expect(await failure(asUser(iso, next, () => iso.query(`select public.transfer_super_admin($1, 'student', 'TRANSFER SUPER ADMIN')`, [old])))).toMatch(/forbidden/);

      await asUser(iso, old, () => iso.query(`select public.transfer_super_admin($1, 'content_admin', 'TRANSFER SUPER ADMIN')`, [next]));

      const roles = await rows<{ user_id: string; role_id: string }>(iso, `select user_id, role_id from public.user_roles where user_id in ($1,$2)`, [old, next]);
      expect(roles.find((r) => r.user_id === old)?.role_id).toBe('content_admin');
      expect(roles.find((r) => r.user_id === next)?.role_id).toBe('super_admin');
      const [{ n }] = await rows<{ n: number }>(iso, `select count(*)::int as n from public.user_roles where role_id = 'super_admin'`);
      expect(n).toBe(1);

      // The former owner immediately loses super powers.
      expect(await failure(asUser(iso, old, () => iso.query(`select public.set_user_role($1, 'student')`, [next])))).toMatch(/forbidden/);

      const log = await rows<{ action: string; actor_id: string }>(iso, `select action, actor_id from public.audit_logs where action like 'super_admin.%' order by id`);
      expect(log.map((l) => l.action)).toEqual(['super_admin.bootstrap', 'super_admin.transfer']);
      expect(log[1].actor_id).toBe(old);
    } finally {
      await iso.close();
    }
  });

  it('rolls back completely if the transfer target is invalid', async () => {
    const iso = await createDb();
    try {
      const old = await bootstrapSuperAdmin(iso);
      const suspended = await makeUser(iso, 'suspended-target');
      await iso.query(`update public.profiles set account_status = 'suspended' where id = $1`, [suspended]);
      expect(await failure(asUser(iso, old, () => iso.query(`select public.transfer_super_admin($1,'student','TRANSFER SUPER ADMIN')`, [suspended])))).toMatch(/invalid_state/);
      expect(await failure(asUser(iso, old, () => iso.query(`select public.transfer_super_admin($1,'student','TRANSFER SUPER ADMIN')`, [uuid()])))).toMatch(/invalid_state|not_found/);
      const [r] = await rows(iso, `select role_id from public.user_roles where user_id = $1`, [old]);
      expect(r).toEqual({ role_id: 'super_admin' });
    } finally {
      await iso.close();
    }
  });
});

describe('role and permission management', () => {
  it('lets only the super admin assign roles, and only the assignable ones', async () => {
    const mod = await makeUser(db, 'moderator');
    const admin = await makeUser(db, 'content');
    await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'file_moderator')`, [mod]));
    await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'content_admin')`, [admin]));
    expect((await access(mod)).role).toBe('file_moderator');
    expect((await access(admin)).role).toBe('content_admin');

    expect(await failure(asUser(db, owner, () => db.query(`select public.set_user_role($1, 'wizard')`, [mod])))).toMatch(/invalid_input/);
    expect(await failure(asUser(db, owner, () => db.query(`select public.set_user_role($1, 'content_admin')`, [admin])))).toMatch(/invalid_state/);
  });

  it('maps default roles to the documented permissions', async () => {
    const mod = await makeUser(db, 'm');
    const ca = await makeUser(db, 'c');
    await setRole(db, mod, 'file_moderator');
    await setRole(db, ca, 'content_admin');
    expect((await access(mod)).permissions).toEqual([
      'contributions.approve', 'contributions.read', 'contributions.reject', 'contributions.review', 'resources.read',
    ]);
    expect((await access(ca)).permissions).toEqual([
      'resources.archive', 'resources.create', 'resources.edit', 'resources.publish', 'resources.read',
    ]);
    const all = (await rows<{ key: string }>(db, `select key from public.permissions`)).map((p) => p.key).sort();
    expect((await access(owner)).permissions).toEqual(all);
  });

  it('prevents admins from granting themselves or others anything', async () => {
    const ca = await makeUser(db, 'content-admin');
    const mod = await makeUser(db, 'moderator');
    await setRole(db, ca, 'content_admin');
    await setRole(db, mod, 'file_moderator');

    for (const [actor, target, perm] of [[ca, ca, 'users.read'], [ca, mod, 'resources.edit'], [mod, mod, 'contributions.approve'], [mod, ca, 'audit.read']] as const) {
      expect(await failure(asUser(db, actor, () => db.query(`select public.grant_user_permission($1, $2)`, [target, perm])))).toMatch(/forbidden/);
    }
    for (const [actor, target] of [[ca, mod], [mod, ca]] as const) {
      expect(await failure(asUser(db, actor, () => db.query(`select public.set_user_role($1, 'content_admin')`, [target])))).toMatch(/forbidden/);
    }
    expect((await access(ca)).permissions).not.toContain('users.read');
  });

  it('refuses non-delegable permissions and grants to students', async () => {
    const mod = await makeUser(db, 'mod2');
    const student = await makeUser(db, 'plain');
    await setRole(db, mod, 'file_moderator');
    for (const key of ['roles.manage', 'settings.manage']) {
      expect(await failure(asUser(db, owner, () => db.query(`select public.grant_user_permission($1, $2)`, [mod, key])))).toMatch(/forbidden/);
    }
    expect(await failure(asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'audit.read')`, [student])))).toMatch(/invalid_state/);
  });

  it('grants, de-duplicates and revokes individual permissions with immediate effect', async () => {
    const mod = await makeUser(db, 'mod3');
    await setRole(db, mod, 'file_moderator');
    expect((await access(mod)).permissions).not.toContain('audit.read');

    await asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'audit.read')`, [mod]));
    expect((await access(mod)).permissions).toContain('audit.read');
    const logs = await asUser(db, mod, () => db.query(`select count(*)::int as n from public.audit_logs`));
    expect((logs.rows[0] as any).n).toBeGreaterThan(0);

    expect(await failure(asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'audit.read')`, [mod])))).toMatch(/conflict/);
    expect(await failure(asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'contributions.review')`, [mod])))).toMatch(/conflict/);

    await asUser(db, owner, () => db.query(`select public.revoke_user_permission($1, 'audit.read')`, [mod]));
    expect((await access(mod)).permissions).not.toContain('audit.read');
    expect((await asUser(db, mod, () => db.query(`select count(*)::int as n from public.audit_logs`))).rows[0]).toEqual({ n: 0 });
  });

  it('clears individual grants when demoted to student', async () => {
    const mod = await makeUser(db, 'mod4');
    await setRole(db, mod, 'file_moderator');
    await asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'users.read')`, [mod]));
    await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'student')`, [mod]));
    expect((await access(mod)).permissions).toEqual(['resources.read']);
    expect((await rows(db, `select 1 from public.user_permissions where user_id = $1`, [mod])).length).toBe(0);
  });
});

describe('suspension', () => {
  it('removes all permissions immediately and blocks writes', async () => {
    const mod = await makeUser(db, 'to-suspend');
    await setRole(db, mod, 'file_moderator');
    await asUser(db, owner, () => db.query(`select public.set_account_status($1, 'suspended', 'spam')`, [mod]));
    const a = await access(mod);
    expect(a.status).toBe('suspended');
    expect(a.permissions).toEqual([]);
    expect(await failure(asUser(db, mod, () => db.query(`select public.claim_contribution($1)`, [uuid()])))).toMatch(/forbidden/);
    // RLS hides the row from the write path for suspended accounts: zero rows change, no error.
    const update = await asUser(db, mod, () => db.query(`update public.profiles set full_name = 'x' where id = $1`, [mod]));
    expect(update.affectedRows).toBe(0);
    expect((await access(mod)).full_name).toBe('to-suspend');
  });

  it('requires a reason, lets users.suspend holders handle students only, and can reactivate', async () => {
    const helper = await makeUser(db, 'helper');
    const student = await makeUser(db, 'naughty');
    const staff = await makeUser(db, 'staff');
    await setRole(db, helper, 'file_moderator');
    await setRole(db, staff, 'content_admin');
    await asUser(db, owner, () => db.query(`select public.grant_user_permission($1, 'users.suspend')`, [helper]));

    expect(await failure(asUser(db, helper, () => db.query(`select public.set_account_status($1, 'suspended', '')`, [student])))).toMatch(/feedback_required/);
    expect(await failure(asUser(db, helper, () => db.query(`select public.set_account_status($1, 'suspended', 'x')`, [staff])))).toMatch(/forbidden/);
    expect(await failure(asUser(db, helper, () => db.query(`select public.set_account_status($1, 'suspended', 'x')`, [helper])))).toMatch(/forbidden/);

    await asUser(db, helper, () => db.query(`select public.set_account_status($1, 'suspended', 'harassment')`, [student]));
    expect((await access(student)).status).toBe('suspended');
    await asUser(db, helper, () => db.query(`select public.set_account_status($1, 'active')`, [student]));
    expect((await access(student)).status).toBe('active');
  });

  it('is visible to the user so the UI can explain it', async () => {
    const u = await makeUser(db, 'visible');
    await asUser(db, owner, () => db.query(`select public.set_account_status($1, 'suspended', 'reason')`, [u]));
    const a = await access(u);
    expect(a).toMatchObject({ status: 'suspended', login_allowed: false });
  });
});

describe('user directory visibility', () => {
  it('shows account lists only to users.read holders', async () => {
    const student = await makeUser(db, 's');
    const mod = await makeUser(db, 'm');
    await setRole(db, mod, 'file_moderator');
    expect((await asUser(db, student, () => db.query(`select count(*)::int as n from public.profiles`))).rows[0]).toEqual({ n: 1 });
    expect((await asUser(db, mod, () => db.query(`select count(*)::int as n from public.profiles`))).rows[0]).toEqual({ n: 1 });
    const total = (await asUser(db, owner, () => db.query(`select count(*)::int as n from public.profiles`))).rows[0] as any;
    expect(total.n).toBeGreaterThan(5);
    expect((await asUser(db, mod, () => db.query(`select count(*)::int as n from public.user_roles`))).rows[0]).toEqual({ n: 1 });
  });
});

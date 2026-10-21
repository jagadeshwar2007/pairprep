import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon, asService, asUser, bootstrapSuperAdmin, createDb, failure, makeUser, putObject, rows, setRole, submitLink,
  uuid, validatedUpload, type Db,
} from './harness';

let db: Db;
let owner: string;
let moderator: string;
let alice: string;

beforeAll(async () => {
  db = await createDb();
  owner = await bootstrapSuperAdmin(db);
  moderator = await makeUser(db, 'moderator', 'mod@staff.example');
  alice = await makeUser(db, 'alice', 'alice@gmail.com');
  await setRole(db, moderator, 'file_moderator');
});
afterAll(async () => {
  await db.close();
});

const call = (uid: string, sql: string, params: unknown[] = []) => asUser(db, uid, () => db.query(sql, params));
const setSetting = (uid: string, key: string, value: unknown) =>
  call(uid, `select public.set_app_setting($1, $2::jsonb)`, [key, JSON.stringify(value)]);

describe('audit log', () => {
  it('is append-only, even for the table owner', async () => {
    const [{ id }] = await rows<{ id: string }>(db, `select id from public.audit_logs order by id limit 1`);
    expect(await failure(db.query(`update public.audit_logs set action = 'tampered' where id = $1`, [id]))).toMatch(/append-only/);
    expect(await failure(db.query(`delete from public.audit_logs where id = $1`, [id]))).toMatch(/append-only/);
    expect(await failure(db.query(`truncate public.audit_logs`))).toMatch(/append-only/);
  });

  it('cannot be written or edited by API roles, and is hidden without audit.read', async () => {
    for (const uid of [alice, moderator, owner]) {
      expect(await failure(call(uid, `insert into public.audit_logs (action, target_type) values ('fake','x')`))).toMatch(/permission denied/i);
      expect(await failure(call(uid, `delete from public.audit_logs`))).toMatch(/permission denied/i);
      expect(await failure(call(uid, `update public.audit_logs set action = 'x'`))).toMatch(/permission denied/i);
    }
    expect((await call(alice, `select count(*)::int as n from public.audit_logs`)).rows[0]).toEqual({ n: 0 });
    expect((await call(moderator, `select count(*)::int as n from public.audit_logs`)).rows[0]).toEqual({ n: 0 });
    expect(((await call(owner, `select count(*)::int as n from public.audit_logs`)).rows[0] as any).n).toBeGreaterThan(0);
    expect(await failure(asAnon(db, () => db.query(`select 1 from public.audit_logs`)))).toMatch(/permission denied/i);
  });

  it('survives deletion of the acting account', async () => {
    const temp = await makeUser(db, 'temp-staff');
    await setRole(db, temp, 'content_admin');
    await call(temp, `select public.create_resource((select id from public.subjects limit 1),'Audited resource','d','notes','https://example.org/a',null)`);
    await db.query(`delete from auth.users where id = $1`, [temp]);
    const kept = await rows(db, `select 1 from public.audit_logs where actor_id = $1`, [temp]);
    expect(kept.length).toBe(1);
  });
});

describe('application settings', () => {
  it('are readable publicly only when flagged public', async () => {
    const anon = (await asAnon(db, () => db.query(`select key from public.app_settings order by key`))).rows.map((r: any) => r.key);
    expect(anon).toEqual(['allowed_email_domains', 'allowed_file_types', 'max_upload_bytes']);
    const mod = (await call(moderator, `select key from public.app_settings`)).rows.map((r: any) => r.key);
    expect(mod).toEqual(expect.arrayContaining(['allowed_email_domains']));
    expect(mod).not.toContain('max_open_contributions');
    expect((await call(owner, `select count(*)::int as n from public.app_settings`)).rows[0]).toEqual({ n: 6 });
  });

  it('can only be changed by the super admin, with validation', async () => {
    expect(await failure(setSetting(moderator, 'max_upload_bytes', 1048576))).toMatch(/forbidden/);
    expect(await failure(setSetting(alice, 'max_upload_bytes', 1048576))).toMatch(/forbidden/);
    expect(await failure(call(alice, `update public.app_settings set value = '1'::jsonb`))).toMatch(/permission denied/i);

    expect(await failure(setSetting(owner, 'nope', 1))).toMatch(/not_found/);
    expect(await failure(setSetting(owner, 'max_upload_bytes', 999999999))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'max_upload_bytes', 'big'))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'allowed_file_types', ['exe']))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'allowed_file_types', []))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'allowed_email_domains', ['@college.edu']))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'allowed_email_domains', ['COLLEGE.edu']))).toMatch(/invalid_input/);
    expect(await failure(setSetting(owner, 'abandoned_upload_hours', 0))).toMatch(/invalid_input/);

    await setSetting(owner, 'max_upload_bytes', 10485760);
    expect((await asAnon(db, () => db.query(`select value from public.app_settings where key = 'max_upload_bytes'`))).rows).toEqual([{ value: 10485760 }]);
    await setSetting(owner, 'max_upload_bytes', 26214400);

    const log = await rows<any>(db, `select action, target_id, metadata from public.audit_logs where action = 'setting.update' order by id desc limit 1`);
    expect(log[0].target_id).toBe('max_upload_bytes');
    expect(log[0].metadata).toEqual({ from: 10485760, to: 26214400 });
  });
});

describe('college email domain restriction', () => {
  const hook = async (email: string) =>
    (await db.query<{ r: any }>(`select public.hook_before_user_created($1::jsonb) as r`, [JSON.stringify({ user: { email } })])).rows[0].r;

  it('is off by default: any Google account may register', async () => {
    expect(await hook('anyone@gmail.com')).toEqual({});
    await expect(submitLink(db, alice)).resolves.toBeTruthy();
  });

  it('when configured, rejects other domains at signup (Auth hook) and blocks their writes', async () => {
    const student = await makeUser(db, 'college-student', 'ravi@college.edu');
    await setSetting(owner, 'allowed_email_domains', ['college.edu']);
    try {
      expect(await hook('ravi@college.edu')).toEqual({});
      expect(await hook('RAVI@COLLEGE.EDU')).toEqual({});
      expect((await hook('someone@gmail.com')).error.http_code).toBe(403);
      expect((await hook('x@college.edu.evil.com')).error.http_code).toBe(403);
      expect((await hook('x@evilcollege.edu')).error.http_code).toBe(403);
      expect((await hook('')).error.http_code).toBe(400);

      // Even if such an account already exists (hook disabled, or created earlier) the database refuses to act for it.
      expect(await failure(submitLink(db, alice))).toMatch(/account_inactive/);
      await expect(submitLink(db, student)).resolves.toBeTruthy();
      const a = (await call(alice, `select public.my_access() as a`)).rows[0] as any;
      expect(a.a.login_allowed).toBe(false);
      expect(await failure(call(alice, `insert into public.bookmarks (user_id, resource_id) values ($1, $2)`, [alice, uuid()]))).toMatch(/row-level security|violates foreign/i);
      expect(await failure(call(alice, `insert into storage.objects (bucket_id, name, metadata) values ('contributions-private', $1, '{}'::jsonb)`, [`${alice}/${uuid()}.pdf`]))).toMatch(/row-level security/i);

      // Staff are exempt so the owner can never lock themselves out.
      expect(((await call(owner, `select public.my_access() as a`)).rows[0] as any).a).toMatchObject({ role: 'super_admin', login_allowed: true });
      expect(((await call(moderator, `select public.my_access() as a`)).rows[0] as any).a).toMatchObject({ role: 'file_moderator', login_allowed: true });
    } finally {
      await setSetting(owner, 'allowed_email_domains', []);
    }
    await expect(submitLink(db, alice, { title: 'Works again after disabling' })).resolves.toBeTruthy();
  });
});

describe('retention and cleanup', () => {
  it('is available to the service role only', async () => {
    for (const sql of [`select * from public.list_purgeable_files()`, `select public.mark_files_purged('contributions-private', array['x'])`]) {
      expect(await failure(call(owner, sql))).toMatch(/permission denied/i);
      expect(await failure(asAnon(db, () => db.query(sql)))).toMatch(/permission denied/i);
    }
  });

  it('finds abandoned uploads, rejected files past retention and superseded revisions, but never live files', async () => {
    const bob = await makeUser(db, 'bob-cleanup');
    const old = `now() - interval '3 days'`;

    // abandoned: uploaded + validated, never submitted
    const abandoned = await validatedUpload(db, bob);
    // fresh abandoned upload is kept for now
    const fresh = await validatedUpload(db, bob);
    await db.query(`update storage.objects set created_at = ${old} where name = $1`, [abandoned]);

    // submitted and live
    const livePath = await validatedUpload(db, bob);
    const liveId = ((await call(bob, `select public.submit_contribution((select id from public.subjects limit 1),'Live hosted file','d','notes',null,$1,null) as id`, [livePath])).rows[0] as any).id;
    await db.query(`update storage.objects set created_at = ${old} where name = $1`, [livePath]);

    // rejected long ago
    const rejPath = await validatedUpload(db, bob);
    const rejId = ((await call(bob, `select public.submit_contribution((select id from public.subjects limit 1),'Rejected hosted file','d','notes',null,$1,null) as id`, [rejPath])).rows[0] as any).id;
    await call(moderator, `select public.review_contribution($1,'reject','Not relevant')`, [rejId]);
    await db.query(`update storage.objects set created_at = ${old} where name = $1`, [rejPath]);

    // superseded revision after a requested change
    const v1 = await validatedUpload(db, bob);
    const supId = ((await call(bob, `select public.submit_contribution((select id from public.subjects limit 1),'Superseded hosted file','d','notes',null,$1,null) as id`, [v1])).rows[0] as any).id;
    await call(moderator, `select public.review_contribution($1,'request_changes','Please re-scan')`, [supId]);
    const v2 = await validatedUpload(db, bob);
    await call(bob, `select public.resubmit_contribution($1,(select id from public.subjects limit 1),'Superseded hosted file','d','notes',false,null,$2,null)`, [supId, v2]);
    await db.query(`update storage.objects set created_at = ${old} where name = any($1)`, [[v1, v2]]);

    // backdate retention windows
    await db.query(`update public.contributions set reviewed_at = now() - interval '40 days' where id = $1`, [rejId]);
    await db.query(`update public.contribution_revisions set created_at = now() - interval '40 days' where contribution_id = $1 and revision = 1`, [supId]);

    const purge = (await asService(db, () => db.query<{ bucket: string; path: string; reason: string }>(`select * from public.list_purgeable_files()`))).rows;
    const byPath = new Map(purge.map((p) => [p.path, p.reason]));
    expect(byPath.get(abandoned)).toBe('abandoned');
    expect(byPath.get(rejPath)).toBe('rejected_retention');
    expect(byPath.get(v1)).toBe('superseded');
    expect(byPath.has(fresh)).toBe(false);
    expect(byPath.has(livePath)).toBe(false);
    expect(byPath.has(v2)).toBe(false);

    // after the app deletes the objects it records that fact, and the rows stay consistent
    await asService(db, () => db.query(`select public.mark_files_purged('contributions-private', $1)`, [[abandoned, rejPath, v1]]));
    const [rej] = await rows<any>(db, `select storage_path, files_purged_at, status from public.contributions where id = $1`, [rejId]);
    expect(rej.storage_path).toBeNull();
    expect(rej.files_purged_at).not.toBeNull();
    expect(rej.status).toBe('rejected');
    expect((await rows(db, `select 1 from public.upload_validations where path = $1`, [abandoned])).length).toBe(0);
    const live = await rows<any>(db, `select storage_path from public.contributions where id = $1`, [liveId]);
    expect(live[0].storage_path).toBe(livePath);
  });

  it('purges unreferenced published-bucket orphans but never referenced files', async () => {
    const orphan = `approved/${uuid()}/orphan.pdf`;
    const kept = `approved/${uuid()}/kept.pdf`;
    await putObject(db, 'resources-published', orphan);
    await putObject(db, 'resources-published', kept);
    await db.query(`insert into public.resources (subject_id, title, resource_type, storage_path, status, published_at)
                    values ((select id from public.subjects limit 1),'Kept hosted resource','notes',$1,'published',now())`, [kept]);
    await db.query(`update storage.objects set created_at = now() - interval '3 days' where bucket_id = 'resources-published'`);
    const purge = (await asService(db, () => db.query<{ path: string }>(`select path from public.list_purgeable_files() where bucket = 'resources-published'`))).rows.map((p) => p.path);
    expect(purge).toContain(orphan);
    expect(purge).not.toContain(kept);
  });
});

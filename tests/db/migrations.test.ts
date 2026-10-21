import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createDb, failure, makeUser, rows, type Db } from './harness';

let db: Db;
beforeAll(async () => {
  db = await createDb();
});
afterAll(async () => {
  await db.close();
});

describe('migrations', () => {
  it('apply cleanly in order and seed the catalog', async () => {
    const [{ branches }] = await rows<{ branches: number }>(db, `select count(*)::int as branches from public.branches`);
    const [{ subjects }] = await rows<{ subjects: number }>(db, `select count(*)::int as subjects from public.subjects`);
    expect(branches).toBe(8);
    expect(subjects).toBe(26);
  });

  it('keeps the catalog migration in sync with src/data/academicData.ts', () => {
    const script = join(__dirname, '..', '..', 'scripts', 'generate-catalog-sql.mjs');
    expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('applies the development seed cleanly, as clearly labelled published samples', async () => {
    const seed = readFileSync(join(__dirname, '..', '..', 'supabase', 'seed.sql'), 'utf8');
    await db.exec(seed);
    const samples = await rows<{ title: string; external_url: string; status: string }>(
      db,
      `select title, external_url, status from public.resources order by title`,
    );
    expect(samples.length).toBe(4);
    for (const r of samples) {
      expect(r.title).toMatch(/^\[Sample\]/);
      expect(r.status).toBe('published');
      expect(r.external_url).toMatch(/^https:\/\/example\.org\//);
    }
    // re-running is harmless in dev
    await db.exec('delete from public.resources');
  });

  it('enables row level security on every table in public', async () => {
    const unprotected = await rows<{ relname: string }>(
      db,
      `select c.relname
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(unprotected).toEqual([]);
  });

  it('grants API roles no write access on privileged tables', async () => {
    const privileged = [
      'roles', 'permissions', 'role_permissions', 'user_roles', 'user_permissions', 'app_settings',
      'audit_logs', 'contributions', 'contribution_revisions', 'contribution_reviews', 'contribution_flags',
      'resources', 'upload_validations', 'branches', 'subjects',
    ];
    const leaks = await rows<{ table_name: string; grantee: string; privilege_type: string }>(
      db,
      `select table_name, grantee, privilege_type
         from information_schema.role_table_grants
        where table_schema = 'public'
          and grantee in ('anon', 'authenticated', 'PUBLIC')
          and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
          and table_name = any ($1)`,
      [privileged],
    );
    expect(leaks).toEqual([]);

    // Notifications can be deleted by their owner (RLS-limited) but never forged or edited.
    const forged = await rows(
      db,
      `select grantee, privilege_type from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'notifications'
          and grantee in ('anon', 'authenticated', 'PUBLIC')
          and privilege_type in ('INSERT', 'UPDATE', 'TRUNCATE')`,
    );
    expect(forged).toEqual([]);
  });

  it('does not let anon or authenticated execute service-role or internal functions', async () => {
    const callable = await rows<{ proname: string; grantee: string }>(
      db,
      `select p.proname, r.rolname as grantee
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
        where n.nspname = 'public'
          and p.proname in ('bootstrap_super_admin', 'record_upload_validation', 'list_purgeable_files',
                            'mark_files_purged', 'hook_before_user_created')
          and has_function_privilege(r.rolname, p.oid, 'execute')`,
    );
    expect(callable).toEqual([]);
  });

  it('blocks anon from every authenticated-only RPC', async () => {
    const uid = await makeUser(db, 'someone');
    const msg = await failure(asAnon(db, () => db.query(`select public.my_access()`)));
    expect(msg).toMatch(/permission denied/i);
    const msg2 = await failure(asAnon(db, () => db.query(`select public.set_user_role($1, 'content_admin')`, [uid])));
    expect(msg2).toMatch(/permission denied/i);
    // ...while authenticated callers reach the function and are refused by its own checks.
    const msg3 = await failure(asUser(db, uid, () => db.query(`select public.set_user_role($1, 'content_admin')`, [uid])));
    expect(msg3).toMatch(/forbidden/);
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, rows, type Db } from './harness';

/**
 * Static contract check between the app code and the migrations. Without a live PostgREST, a typo in
 * an RPC name, an argument name, a table or a bucket would only surface at runtime. This catches it in CI.
 */
const SRC = join(__dirname, '..', '..', 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path: path.replace(SRC, 'src'), text: readFileSync(path, 'utf8') }));

let db: Db;
beforeAll(async () => {
  db = await createDb();
});
afterAll(async () => {
  await db.close();
});

describe('app <-> database contract', () => {
  it('every .rpc() call names a real public function and only passes its real argument names', async () => {
    const fns = await rows<{ proname: string; args: string[] | null }>(
      db,
      `select p.proname, p.proargnames as args
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'`,
    );
    const known = new Map(fns.map((f) => [f.proname, new Set(f.args ?? [])]));

    const calls: { file: string; name: string; keys: string[] }[] = [];
    for (const f of files) {
      for (const m of f.text.matchAll(/\.rpc\(\s*'([a-z_]+)'\s*(?:,\s*\{([^}]*)\})?/g)) {
        const keys = [...(m[2] ?? '').matchAll(/\b(p_[a-z_]+)\s*:/g)].map((k) => k[1]);
        calls.push({ file: f.path, name: m[1], keys });
      }
    }
    expect(calls.length).toBeGreaterThan(25); // sanity: the scan actually found the app's RPC calls

    const problems: string[] = [];
    for (const c of calls) {
      const args = known.get(c.name);
      if (!args) {
        problems.push(`${c.file}: rpc('${c.name}') does not exist`);
        continue;
      }
      for (const k of c.keys) if (!args.has(k)) problems.push(`${c.file}: rpc('${c.name}') passes unknown argument ${k}`);
    }
    expect(problems).toEqual([]);
  });

  it('every RPC the app calls as a signed-in user is executable by the authenticated role (and not by anon unless intended)', async () => {
    const userCalled = new Set<string>();
    const adminCalled = new Set<string>();
    for (const f of files) {
      const isAdminCode = /createAdminClient|admin\.rpc|cron\/cleanup|files\/validate/.test(f.text);
      for (const m of f.text.matchAll(/\.rpc\(\s*'([a-z_]+)'/g)) (isAdminCode && /admin\.rpc/.test(f.text) ? adminCalled : userCalled).add(m[1]);
    }
    const privileges = await rows<{ proname: string; authed: boolean; anon: boolean; service: boolean }>(
      db,
      `select p.proname,
              has_function_privilege('authenticated', p.oid, 'execute') as authed,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('service_role', p.oid, 'execute') as service
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`,
    );
    const byName = new Map(privileges.map((p) => [p.proname, p]));
    const serviceOnly = new Set(['record_upload_validation', 'list_purgeable_files', 'mark_files_purged', 'bootstrap_super_admin']);

    for (const name of userCalled) {
      if (serviceOnly.has(name)) continue; // only ever called through the admin client
      expect(byName.get(name)?.authed, `authenticated cannot execute ${name}`).toBe(true);
    }
    for (const name of serviceOnly) {
      expect(byName.get(name), name).toMatchObject({ authed: false, anon: false, service: true });
    }
    // The only RPCs anonymous visitors may call.
    const anonCallable = privileges.filter((p) => p.anon).map((p) => p.proname).sort();
    expect(anonCallable).toEqual(['record_download', 'resource_file_path']);
    void adminCalled;
  });

  it('every .from() table exists in public', async () => {
    const tables = new Set((await rows<{ tablename: string }>(db, `select tablename from pg_tables where schemaname = 'public'`)).map((t) => t.tablename));
    const used = new Set<string>();
    for (const f of files) {
      if (f.path.includes('/lib/data/resource-mapper')) continue;
      for (const m of f.text.matchAll(/\.from\(\s*'([a-z_]+)'\s*\)/g)) used.add(m[1]);
      for (const m of f.text.matchAll(/head\(\s*'([a-z_]+)'/g)) used.add(m[1]);
    }
    used.delete('storage'); // supabase.storage.from('bucket') is checked below
    const buckets = new Set((await rows<{ id: string }>(db, `select id from storage.buckets`)).map((b) => b.id));
    const missing = [...used].filter((t) => !tables.has(t) && !buckets.has(t));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(10);
  });

  it('every storage bucket the app names exists and is private', async () => {
    const named = new Set<string>();
    for (const f of files) {
      for (const m of f.text.matchAll(/storage\s*\.from\(\s*'([a-z-]+)'\s*\)/g)) named.add(m[1]);
      for (const m of f.text.matchAll(/\.from\(\s*'(contributions-private|resources-published)'\s*\)/g)) named.add(m[1]);
      for (const m of f.text.matchAll(/destinationBucket:\s*'([a-z-]+)'/g)) named.add(m[1]);
    }
    expect([...named].sort()).toEqual(['contributions-private', 'resources-published']);
    const buckets = await rows<{ id: string; public: boolean }>(db, `select id, public from storage.buckets`);
    for (const name of named) expect(buckets.find((b) => b.id === name), name).toMatchObject({ public: false });
  });

  it('only the documented tables are read by name with .select() from user-facing code, and each is readable by authenticated', async () => {
    const readable = await rows<{ table_name: string }>(
      db,
      `select distinct table_name from information_schema.role_table_grants
        where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'SELECT'`,
    );
    const granted = new Set(readable.map((r) => r.table_name));
    // Column-level grants (e.g. resources, profiles.update) show up in column_privileges instead.
    const colGranted = new Set(
      (await rows<{ table_name: string }>(db, `select distinct table_name from information_schema.column_privileges where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'SELECT'`)).map((r) => r.table_name),
    );
    const clientTables = ['bookmarks', 'notifications', 'user_preferences', 'attendance_courses', 'app_settings', 'branches', 'subjects', 'profiles', 'resources', 'contributions', 'contribution_revisions', 'contribution_reviews', 'contribution_flags', 'resource_reports', 'feedback', 'audit_logs', 'user_roles', 'user_permissions', 'permissions'];
    for (const t of clientTables) expect(granted.has(t) || colGranted.has(t), `authenticated cannot read ${t}`).toBe(true);
    // ...and nothing sensitive is readable that the app doesn't need to expose.
    expect(granted.has('upload_validations')).toBe(false);
  });
});

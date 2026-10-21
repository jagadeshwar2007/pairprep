import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = join(__dirname, '..', '..');

export type Db = PGlite;
export type Role = 'anon' | 'authenticated' | 'service_role';

/** Fresh Postgres with Supabase stand-ins and every migration applied in order. */
export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, 'supabase-stubs.sql'), 'utf8'));
  const dir = process.env.MIGRATIONS_DIR ?? join(root, 'supabase', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

/**
 * Runs `fn` with the connection acting as an API role, exactly like PostgREST does:
 * the role is switched and the JWT subject claim is set. Always resets afterwards.
 */
export async function as<T>(db: Db, role: Role, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export const asUser = <T>(db: Db, uid: string, fn: () => Promise<T>) => as(db, 'authenticated', uid, fn);
export const asAnon = <T>(db: Db, fn: () => Promise<T>) => as(db, 'anon', null, fn);
export const asService = <T>(db: Db, fn: () => Promise<T>) => as(db, 'service_role', null, fn);

export async function rows<R = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []): Promise<R[]> {
  return (await db.query<R>(sql, params)).rows;
}

/** Returns the error message (or throws if the statement unexpectedly succeeded). */
export async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { detail?: string };
    return `${e.message}${e.detail ? ` | ${e.detail}` : ''}`;
  }
  throw new Error('Expected the statement to fail, but it succeeded');
}

/** Creates an auth user the same way Supabase Auth does; triggers provision profile + student role. */
export async function makeUser(db: Db, label: string, email?: string, meta: object = {}): Promise<string> {
  const id = randomUUID();
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)`,
    [id, email ?? `${label}-${id.slice(0, 6)}@example.com`, JSON.stringify({ full_name: label, ...meta })],
  );
  return id;
}

/** Test setup only: assigns a role directly as the superuser (bypassing the RPC rules under test). */
export async function setRole(db: Db, uid: string, role: string) {
  await db.query(`update public.user_roles set role_id = $2 where user_id = $1`, [uid, role]);
}

export async function bootstrapSuperAdmin(db: Db, label = 'owner'): Promise<string> {
  const uid = await makeUser(db, label);
  await asService(db, () => db.query(`select public.bootstrap_super_admin($1)`, [uid]));
  return uid;
}

export async function subjectId(db: Db, slug = 'cs-13101'): Promise<string> {
  const [row] = await rows<{ id: string }>(db, `select id from public.subjects where slug = $1`, [slug]);
  return row.id;
}

/** An object as it would exist after a user uploaded through the Storage API. */
export async function putObject(
  db: Db,
  bucket: string,
  name: string,
  size = 2048,
  mimetype = 'application/pdf',
): Promise<string> {
  const [row] = await rows<{ id: string }>(
    db,
    `insert into storage.objects (bucket_id, name, metadata) values ($1, $2, $3::jsonb) returning id`,
    [bucket, name, JSON.stringify({ size, mimetype })],
  );
  return row.id;
}

/** Server-side validation, as performed by src/lib/uploads (service role). */
export async function validateUpload(
  db: Db,
  bucket: string,
  path: string,
  userId: string,
  opts: { type?: string; mime?: string; size?: number; name?: string } = {},
) {
  return asService(db, () =>
    db.query(`select public.record_upload_validation($1,$2,$3,$4,$5,$6,$7) as id`, [
      bucket,
      path,
      userId,
      opts.type ?? 'pdf',
      opts.mime ?? 'application/pdf',
      opts.size ?? 2048,
      opts.name ?? 'notes.pdf',
    ]),
  );
}

export const uuid = () => randomUUID();

/** A private upload that has been validated, ready for submit_contribution. */
export async function validatedUpload(db: Db, userId: string, name = 'notes.pdf'): Promise<string> {
  const path = `${userId}/${uuid()}.pdf`;
  await asUser(db, userId, () =>
    db.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ('contributions-private', $1, $2, $3::jsonb)`, [
      path,
      userId,
      JSON.stringify({ size: 2048, mimetype: 'application/pdf' }),
    ]),
  );
  await validateUpload(db, 'contributions-private', path, userId, { name });
  return path;
}

export async function submitLink(
  db: Db,
  userId: string,
  overrides: Partial<{ title: string; url: string; type: string; credit: string | null }> = {},
): Promise<string> {
  const subject = await subjectId(db);
  const result = await asUser(db, userId, () =>
    db.query<{ id: string }>(`select public.submit_contribution($1,$2,$3,$4,$5,null,$6) as id`, [
      subject,
      overrides.title ?? 'Trees and heaps handwritten notes',
      'Complete notes',
      overrides.type ?? 'notes',
      overrides.url ?? 'https://drive.google.com/file/d/abc123/view',
      overrides.credit ?? null,
    ]),
  );
  return result.rows[0].id;
}

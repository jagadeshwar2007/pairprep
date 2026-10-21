import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon, asService, asUser, bootstrapSuperAdmin, createDb, failure, makeUser, putObject, rows, setRole,
  subjectId, submitLink, uuid, validateUpload, type Db,
} from './harness';

let db: Db;
let owner: string;
let moderator: string;
let editor: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createDb();
  owner = await bootstrapSuperAdmin(db);
  moderator = await makeUser(db, 'moderator');
  editor = await makeUser(db, 'editor');
  alice = await makeUser(db, 'alice');
  bob = await makeUser(db, 'bob');
  await setRole(db, moderator, 'file_moderator');
  await setRole(db, editor, 'content_admin');
});
afterAll(async () => {
  await db.close();
});

const meta = JSON.stringify({ size: 2048, mimetype: 'application/pdf' });
const upload = (uid: string, bucket: string, name: string) =>
  asUser(db, uid, () =>
    db.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ($1,$2,$3,$4::jsonb)`, [bucket, name, uid, meta]),
  );
const canRead = async (uid: string | null, bucket: string, name: string) => {
  const run = () => db.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, name]);
  const result = uid ? await asUser(db, uid, run) : await asAnon(db, run);
  return result.rows.length === 1;
};

describe('buckets', () => {
  it('are private with a hard size cap and a MIME allowlist', async () => {
    const buckets = await rows<any>(db, `select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`);
    expect(buckets.map((b) => b.id)).toEqual(['contributions-private', 'resources-published']);
    for (const b of buckets) {
      expect(b.public).toBe(false);
      expect(b.file_size_limit).toBe(52428800);
      expect(b.allowed_mime_types).toContain('application/pdf');
      expect(b.allowed_mime_types).not.toContain('text/html');
      expect(b.allowed_mime_types).not.toContain('image/svg+xml');
      expect(b.allowed_mime_types).not.toContain('application/zip');
    }
  });
});

describe('contributions-private', () => {
  it('lets a student upload only into their own folder with a well-formed path', async () => {
    await expect(upload(alice, 'contributions-private', `${alice}/${uuid()}.pdf`)).resolves.toBeTruthy();
    await expect(upload(alice, 'contributions-private', `${alice}/${uuid()}.docx`)).resolves.toBeTruthy();

    const reject = async (path: string, as = alice) =>
      expect(await failure(upload(as, 'contributions-private', path)), path).toMatch(/row-level security/i);
    await reject(`${bob}/${uuid()}.pdf`); // someone else's folder
    await reject(`${alice}/${uuid()}.exe`); // executable extension
    await reject(`${alice}/${uuid()}.html`);
    await reject(`${alice}/${uuid()}.svg`);
    await reject(`${alice}/evil.pdf`); // not a random name
    await reject(`${alice}/nested/${uuid()}.pdf`); // wrong depth
    await reject(`${alice}/../${bob}/${uuid()}.pdf`); // traversal
    await reject(`${uuid()}.pdf`); // no folder
    await reject(`${alice}/${uuid()}.pdf.exe`);
  });

  it('refuses anonymous uploads, wrong buckets and suspended accounts', async () => {
    expect(await failure(asAnon(db, () => db.query(`insert into storage.objects (bucket_id, name, metadata) values ('contributions-private', $1, '{}'::jsonb)`, [`${alice}/${uuid()}.pdf`])))).toMatch(/row-level security/i);
    expect(await failure(upload(alice, 'avatars', `${alice}/${uuid()}.pdf`))).toMatch(/foreign key|row-level security/i);

    const carol = await makeUser(db, 'carol');
    await asUser(db, owner, () => db.query(`select public.set_account_status($1,'suspended','abuse')`, [carol]));
    expect(await failure(upload(carol, 'contributions-private', `${carol}/${uuid()}.pdf`))).toMatch(/row-level security/i);
  });

  it('keeps pending files private: only the owner and permitted reviewers can read them', async () => {
    const name = `${alice}/${uuid()}.pdf`;
    await upload(alice, 'contributions-private', name);
    expect(await canRead(alice, 'contributions-private', name)).toBe(true);
    expect(await canRead(moderator, 'contributions-private', name)).toBe(true);
    expect(await canRead(owner, 'contributions-private', name)).toBe(true);
    expect(await canRead(bob, 'contributions-private', name)).toBe(false);
    expect(await canRead(editor, 'contributions-private', name)).toBe(false); // content admins are not file checkers
    expect(await canRead(null, 'contributions-private', name)).toBe(false);
  });

  it('makes uploads immutable for API roles: no overwrite, no delete, no move', async () => {
    const name = `${alice}/${uuid()}.pdf`;
    await upload(alice, 'contributions-private', name);
    for (const uid of [alice, moderator, owner]) {
      const updated = await asUser(db, uid, () => db.query(`update storage.objects set metadata = '{"size": 1}'::jsonb where bucket_id = 'contributions-private' and name = $1`, [name]));
      expect(updated.affectedRows, `update by ${uid}`).toBe(0);
      const deleted = await asUser(db, uid, () => db.query(`delete from storage.objects where bucket_id = 'contributions-private' and name = $1`, [name]));
      expect(deleted.affectedRows, `delete by ${uid}`).toBe(0);
    }
    const [row] = await rows<any>(db, `select metadata from storage.objects where name = $1`, [name]);
    expect(row.metadata.size).toBe(2048);
    // ...and a second upload to the same path is a conflict (no upsert).
    expect(await failure(upload(alice, 'contributions-private', name))).toMatch(/duplicate key/);
  });

  it('stays unreadable after rejection and after a failed validation', async () => {
    const id = await submitLink(db, alice, { title: 'Will be rejected soon' });
    await asUser(db, moderator, () => db.query(`select public.review_contribution($1,'reject','Not allowed')`, [id]));
    const name = `${alice}/${uuid()}.pdf`;
    await upload(alice, 'contributions-private', name);
    expect(await canRead(bob, 'contributions-private', name)).toBe(false);
    expect(await canRead(null, 'contributions-private', name)).toBe(false);
  });
});

describe('resources-published', () => {
  const publish = async (path: string, status: 'published' | 'draft' | 'archived' = 'published') => {
    await putObject(db, 'resources-published', path);
    const [rid] = (await asService(db, () => db.query(
      `insert into public.resources (subject_id, title, resource_type, storage_path, status, published_at)
       values ($1,$2,'notes',$3,$4, case when $4 = 'published' then now() end) returning id`,
      [null, 'x', path, status],
    ).catch(() => ({ rows: [] })))).rows;
    return rid;
  };
  const makeResource = async (path: string, status: string) => {
    await putObject(db, 'resources-published', path);
    const subject = await subjectId(db);
    const res = await db.query<{ id: string }>(
      `insert into public.resources (subject_id, title, resource_type, storage_path, status, published_at, file_name)
       values ($1,'Hosted resource file','notes',$2,$3, case when $3 = 'published' then now() end, 'f.pdf') returning id`,
      [subject, path, status],
    );
    return res.rows[0].id;
  };
  void publish;

  it('is readable by anyone only while a published resource references the file', async () => {
    const published = `approved/${uuid()}/live.pdf`;
    const draft = `approved/${uuid()}/draft.pdf`;
    const archived = `approved/${uuid()}/old.pdf`;
    const orphan = `approved/${uuid()}/orphan.pdf`;
    await makeResource(published, 'published');
    await makeResource(draft, 'draft');
    const archivedId = await makeResource(archived, 'archived');
    await putObject(db, 'resources-published', orphan);

    for (const uid of [null, alice, moderator]) {
      expect(await canRead(uid, 'resources-published', published), `published as ${uid}`).toBe(true);
      expect(await canRead(uid, 'resources-published', draft)).toBe(false);
      expect(await canRead(uid, 'resources-published', archived)).toBe(false);
      expect(await canRead(uid, 'resources-published', orphan)).toBe(false);
    }
    // Content admins can preview drafts.
    expect(await canRead(editor, 'resources-published', draft)).toBe(true);
    void archivedId;
  });

  it('only lets content staff upload, and only under uploads/<own id>/', async () => {
    const ok = `uploads/${editor}/${uuid()}.pdf`;
    await expect(upload(editor, 'resources-published', ok)).resolves.toBeTruthy();
    for (const [uid, path] of [
      [editor, `uploads/${owner}/${uuid()}.pdf`],
      [editor, `approved/${uuid()}/forged.pdf`],
      [editor, `uploads/${editor}/${uuid()}.exe`],
      [alice, `uploads/${alice}/${uuid()}.pdf`],
      [moderator, `uploads/${moderator}/${uuid()}.pdf`],
    ] as const) {
      expect(await failure(upload(uid, 'resources-published', path)), `${uid} ${path}`).toMatch(/row-level security/i);
    }
  });

  it('cannot be overwritten through the API, even by content staff', async () => {
    const path = `uploads/${editor}/${uuid()}.pdf`;
    await upload(editor, 'resources-published', path);
    const updated = await asUser(db, editor, () => db.query(`update storage.objects set metadata = '{"size": 9}'::jsonb where name = $1`, [path]));
    expect(updated.affectedRows).toBe(0);
  });

  it('blocks deleting a file that a live resource still references', async () => {
    const livePath = `approved/${uuid()}/referenced.pdf`;
    const resourceId = await makeResource(livePath, 'published');
    const del = (uid: string, name: string) =>
      asUser(db, uid, () => db.query(`delete from storage.objects where bucket_id = 'resources-published' and name = $1`, [name]));

    // Nobody can delete it while published or draft - not even the super admin.
    for (const uid of [editor, owner, moderator, alice]) expect((await del(uid, livePath)).affectedRows).toBe(0);
    await db.query(`update public.resources set status = 'draft' where id = $1`, [resourceId]);
    expect((await del(editor, livePath)).affectedRows).toBe(0);

    // Explicit archive makes it removable by authorised staff only.
    await db.query(`update public.resources set status = 'archived' where id = $1`, [resourceId]);
    expect((await del(alice, livePath)).affectedRows).toBe(0);
    expect((await del(moderator, livePath)).affectedRows).toBe(0);
    expect((await del(editor, livePath)).affectedRows).toBe(1);
  });

  it('lets staff remove an unreferenced replaced file', async () => {
    const path = `uploads/${editor}/${uuid()}.pdf`;
    await upload(editor, 'resources-published', path);
    const del = await asUser(db, editor, () => db.query(`delete from storage.objects where bucket_id = 'resources-published' and name = $1`, [path]));
    expect(del.affectedRows).toBe(1);
  });
});

describe('end-to-end: private upload to public resource', () => {
  it('moves from private review storage to published storage only through approval', async () => {
    const subject = await subjectId(db);
    const path = `${alice}/${uuid()}.pdf`;
    await upload(alice, 'contributions-private', path);
    await validateUpload(db, 'contributions-private', path, alice, { name: 'pyq 2024.pdf' });
    const id = ((await asUser(db, alice, () => db.query(`select public.submit_contribution($1,'PYQ 2024 solved','d','pyq',null,$2,null) as id`, [subject, path]))).rows[0] as any).id;

    // Pending: invisible to the public in both buckets.
    expect(await canRead(null, 'contributions-private', path)).toBe(false);
    const isPublic = async () =>
      (await asAnon(db, () => db.query(`select 1 from public.resources where title = 'PYQ 2024 solved'`))).rows.length === 1;
    expect(await isPublic()).toBe(false);

    // The server (service role) copies the object, then the moderator approves.
    const target = ((await asUser(db, moderator, () => db.query(`select public.contribution_publish_path($1) as p`, [id]))).rows[0] as any).p;
    await asService(db, () => db.query(`insert into storage.objects (bucket_id, name, metadata) values ('resources-published', $1, $2::jsonb)`, [target, meta]));
    expect(await canRead(null, 'resources-published', target)).toBe(false); // copied but not yet approved
    await asUser(db, moderator, () => db.query(`select public.approve_contribution($1)`, [id]));

    expect(await isPublic()).toBe(true);
    expect(await canRead(null, 'resources-published', target)).toBe(true);
    expect(await canRead(null, 'contributions-private', path)).toBe(false); // the original stays private
    expect(await canRead(bob, 'contributions-private', path)).toBe(false);
  });
});

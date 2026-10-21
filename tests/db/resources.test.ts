import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon, asUser, bootstrapSuperAdmin, createDb, failure, makeUser, rows, setRole, subjectId, uuid, validatedUpload,
  validateUpload, putObject, type Db,
} from './harness';

let db: Db;
let owner: string;
let editor: string; // content admin
let moderator: string;
let student: string;
let other: string;
let subject: string;

beforeAll(async () => {
  db = await createDb();
  owner = await bootstrapSuperAdmin(db);
  editor = await makeUser(db, 'editor');
  moderator = await makeUser(db, 'moderator');
  student = await makeUser(db, 'student');
  other = await makeUser(db, 'other');
  await setRole(db, editor, 'content_admin');
  await setRole(db, moderator, 'file_moderator');
  subject = await subjectId(db);
});
afterAll(async () => {
  await db.close();
});

const call = (uid: string, sql: string, params: unknown[] = []) => asUser(db, uid, () => db.query(sql, params));
const create = async (uid: string, title: string, publish = false) =>
  ((await call(uid, `select public.create_resource($1,$2,'desc','pyq','https://example.org/paper.pdf',null,$3,null,$4) as id`, [subject, title, ['Trees', ' trees ', 'DSA'], publish])).rows[0] as any).id as string;

describe('content administration', () => {
  it('creates drafts that the public cannot see, normalising tags', async () => {
    const id = await create(editor, 'Official DSA 2024 paper');
    const [r] = await rows<any>(db, `select status, tags, published_at, verified from public.resources where id = $1`, [id]);
    expect(r).toMatchObject({ status: 'draft', tags: ['dsa', 'trees'], published_at: null });
    expect((await asAnon(db, () => db.query(`select 1 from public.resources where id = $1`, [id]))).rows).toEqual([]);
    expect((await call(student, `select 1 from public.resources where id = $1`, [id])).rows).toEqual([]);
    expect((await call(editor, `select 1 from public.resources where id = $1`, [id])).rows.length).toBe(1);
    // moderators have no content access
    expect((await call(moderator, `select 1 from public.resources where id = $1`, [id])).rows).toEqual([]);
  });

  it('publishes, unpublishes and archives with the matching permission', async () => {
    const id = await create(editor, 'Publishing lifecycle paper');
    await call(editor, `select public.set_resource_status($1,'published')`, [id]);
    expect((await asAnon(db, () => db.query(`select title from public.resources where id = $1`, [id]))).rows.length).toBe(1);
    expect(await failure(call(editor, `select public.set_resource_status($1,'published')`, [id]))).toMatch(/invalid_state/);

    await call(editor, `select public.set_resource_status($1,'archived')`, [id]);
    expect((await asAnon(db, () => db.query(`select title from public.resources where id = $1`, [id]))).rows).toEqual([]);

    // Moderators / students can't change status
    expect(await failure(call(moderator, `select public.set_resource_status($1,'published')`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(student, `select public.set_resource_status($1,'archived')`, [id]))).toMatch(/forbidden/);
  });

  it('separates create / publish / archive abilities', async () => {
    const limited = await makeUser(db, 'limited');
    await setRole(db, limited, 'content_admin');
    // Strip down is not possible via UI, so verify with a moderator that was granted only create via super admin.
    const m = await makeUser(db, 'mod-with-create');
    await setRole(db, m, 'file_moderator');
    await call(owner, `select public.grant_user_permission($1,'resources.create')`, [m]);
    const id = await create(m, 'Draft only by moderator with create');
    expect(await failure(call(m, `select public.create_resource($1,'Cannot publish directly','d','notes','https://example.org/x',null,'{}',null,true)`, [subject]))).toMatch(/forbidden/);
    expect(await failure(call(m, `select public.set_resource_status($1,'published')`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(m, `select public.set_resource_status($1,'archived')`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(m, `select public.update_resource($1,$2,'Edited title here','d','notes','{}',null,false)`, [id, subject]))).toMatch(/forbidden/);
  });

  it('edits metadata and swaps the source, returning the replaced file for cleanup', async () => {
    const id = await create(editor, 'Editable resource title');
    const old = await call(editor, `select public.update_resource($1,$2,'Edited resource title','new desc','notes',array['x'],'Credit Name',true) as old`, [id, subject]);
    expect((old.rows[0] as any).old).toBeNull();
    const [r] = await rows<any>(db, `select title, credit, resource_type from public.resources where id = $1`, [id]);
    expect(r).toEqual({ title: 'Edited resource title', credit: 'Credit Name', resource_type: 'notes' });

    // upload a file, validate, attach
    const path = `uploads/${editor}/${uuid()}.pdf`;
    await call(editor, `insert into storage.objects (bucket_id, name, owner, metadata) values ('resources-published', $1, $2, '{"size":2048}'::jsonb)`, [path, editor]);
    await validateUpload(db, 'resources-published', path, editor, { name: 'paper.pdf' });
    await call(editor, `select public.update_resource($1,$2,'Edited resource title','d','notes','{}',null,true,null,$3)`, [id, subject, path]);
    const [after] = await rows<any>(db, `select storage_path, external_url, file_name from public.resources where id = $1`, [id]);
    expect(after).toEqual({ storage_path: path, external_url: null, file_name: 'paper.pdf' });

    // replace the hosted file with an external link: the old path is handed back
    const replaced = await call(editor, `select public.update_resource($1,$2,'Edited resource title','d','notes','{}',null,true,'https://example.org/new.pdf',null) as old`, [id, subject]);
    expect((replaced.rows[0] as any).old).toBe(path);
  });

  it("won't let an admin attach another user's upload or an unvalidated one", async () => {
    const id = await create(editor, 'Attach checks resource');
    const otherEditor = await makeUser(db, 'editor-2');
    await setRole(db, otherEditor, 'content_admin');
    const theirs = `uploads/${otherEditor}/${uuid()}.pdf`;
    await call(otherEditor, `insert into storage.objects (bucket_id, name, owner, metadata) values ('resources-published', $1, $2, '{"size":2048}'::jsonb)`, [theirs, otherEditor]);
    await validateUpload(db, 'resources-published', theirs, otherEditor);
    expect(await failure(call(editor, `select public.update_resource($1,$2,'Attach checks resource','d','notes','{}',null,true,null,$3)`, [id, subject, theirs]))).toMatch(/forbidden/);

    const mine = `uploads/${editor}/${uuid()}.pdf`;
    await call(editor, `insert into storage.objects (bucket_id, name, owner, metadata) values ('resources-published', $1, $2, '{"size":2048}'::jsonb)`, [mine, editor]);
    expect(await failure(call(editor, `select public.update_resource($1,$2,'Attach checks resource','d','notes','{}',null,true,null,$3)`, [id, subject, mine]))).toMatch(/upload_not_validated/);
  });

  it('only lets resources.delete holders delete, and never a published resource', async () => {
    const id = await create(editor, 'Deletion lifecycle paper', true);
    expect(await failure(call(editor, `select public.delete_resource($1)`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(owner, `select public.delete_resource($1)`, [id]))).toMatch(/invalid_state/);
    await call(editor, `select public.set_resource_status($1,'archived')`, [id]);
    await call(owner, `select public.delete_resource($1)`, [id]);
    expect((await rows(db, `select 1 from public.resources where id = $1`, [id])).length).toBe(0);
    expect((await rows(db, `select action from public.audit_logs where target_id = $1 order by id`, [id])).map((r: any) => r.action))
      .toEqual(['resource.create', 'resource.archived', 'resource.delete']);
  });
});

describe('what the public may read', () => {
  it('exposes listing columns only, not provenance or storage internals', async () => {
    const id = await create(editor, 'Public columns check', true);
    const row = (await asAnon(db, () => db.query(`select id, title, resource_type, external_url, tags, credit, verified, downloads_count from public.resources where id = $1`, [id]))).rows;
    expect(row.length).toBe(1);
    for (const col of ['created_by', 'published_by', 'source_contribution_id', 'storage_path']) {
      expect(await failure(asAnon(db, () => db.query(`select ${col} from public.resources`))), col).toMatch(/permission denied/i);
      expect(await failure(call(student, `select ${col} from public.resources`)), col).toMatch(/permission denied/i);
    }
    expect(await failure(asAnon(db, () => db.query(`select 1 from public.upload_validations`)))).toMatch(/permission denied/i);
    expect(await failure(asAnon(db, () => db.query(`select 1 from public.contributions`)))).toMatch(/permission denied/i);
  });

  it('counts downloads of published resources only', async () => {
    const pub = await create(editor, 'Download counter published', true);
    const draft = await create(editor, 'Download counter draft');
    await asAnon(db, () => db.query(`select public.record_download($1)`, [pub]));
    await asAnon(db, () => db.query(`select public.record_download($1)`, [pub]));
    await asAnon(db, () => db.query(`select public.record_download($1)`, [draft]));
    const counts = await rows<any>(db, `select id, downloads_count from public.resources where id = any($1)`, [[pub, draft]]);
    expect(counts.find((c) => c.id === pub)?.downloads_count).toBe(2);
    expect(counts.find((c) => c.id === draft)?.downloads_count).toBe(0);
  });

  it('resolves file paths only for published resources (and drafts for content staff)', async () => {
    const mk = async (status: string) => {
      const path = `approved/${uuid()}/f.pdf`;
      await putObject(db, 'resources-published', path);
      const r = await db.query<{ id: string }>(
        `insert into public.resources (subject_id, title, resource_type, storage_path, status, published_at, file_name)
         values ($1,'Path resolution check','notes',$2,$3, case when $3 = 'published' then now() end,'f.pdf') returning id`,
        [subject, path, status],
      );
      return { id: r.rows[0].id, path };
    };
    const pub = await mk('published');
    const draft = await mk('draft');
    const archived = await mk('archived');
    const resolveAs = async (uid: string | null, id: string) => {
      const run = () => db.query<{ p: string | null }>(`select public.resource_file_path($1) as p`, [id]);
      return (uid ? await asUser(db, uid, run) : await asAnon(db, run)).rows[0].p;
    };

    expect(await resolveAs(null, pub.id)).toBe(pub.path);
    expect(await resolveAs(null, draft.id)).toBeNull();
    expect(await resolveAs(null, archived.id)).toBeNull();
    expect(await resolveAs(student, draft.id)).toBeNull();
    expect(await resolveAs(moderator, draft.id)).toBeNull();
    expect(await resolveAs(editor, draft.id)).toBe(draft.path);
    expect(await resolveAs(null, uuid())).toBeNull();
  });

  it('serves the catalog to everyone', async () => {
    expect((await asAnon(db, () => db.query(`select count(*)::int as n from public.subjects`))).rows[0]).toEqual({ n: 26 });
    expect(await failure(asAnon(db, () => db.query(`insert into public.subjects (branch_id, academic_year, semester, code, name, slug) select id, 'first-year', 1, 'X', 'X', 'x' from public.branches limit 1`)))).toMatch(/permission denied/i);
  });
});

describe('bookmarks', () => {
  it('persist per user, only for published resources, and stay private', async () => {
    const pub = await create(editor, 'Bookmark target published', true);
    const draft = await create(editor, 'Bookmark target draft');
    await call(student, `insert into public.bookmarks (user_id, resource_id) values ($1,$2)`, [student, pub]);
    expect(await failure(call(student, `insert into public.bookmarks (user_id, resource_id) values ($1,$2)`, [student, draft]))).toMatch(/row-level security/i);
    expect(await failure(call(student, `insert into public.bookmarks (user_id, resource_id) values ($1,$2)`, [other, pub]))).toMatch(/row-level security/i);
    expect(await failure(call(student, `insert into public.bookmarks (user_id, resource_id) values ($1,$2)`, [student, pub]))).toMatch(/duplicate key/);

    expect((await call(student, `select resource_id from public.bookmarks`)).rows).toEqual([{ resource_id: pub }]);
    expect((await call(other, `select resource_id from public.bookmarks`)).rows).toEqual([]);
    expect((await call(other, `delete from public.bookmarks where user_id = $1`, [student])).affectedRows).toBe(0);
    expect((await call(editor, `select * from public.bookmarks`)).rows).toEqual([]);
    expect((await asAnon(db, () => db.query(`select 1`)).catch(() => null))).toBeTruthy();
    expect(await failure(asAnon(db, () => db.query(`select * from public.bookmarks`)))).toMatch(/permission denied/i);

    await call(student, `delete from public.bookmarks where resource_id = $1`, [pub]);
    expect((await call(student, `select * from public.bookmarks`)).rows).toEqual([]);
  });

  it('disappear with the resource they point to', async () => {
    const id = await create(editor, 'Bookmark cascade resource', true);
    await call(student, `insert into public.bookmarks (user_id, resource_id) values ($1,$2)`, [student, id]);
    await call(editor, `select public.set_resource_status($1,'archived')`, [id]);
    await call(owner, `select public.delete_resource($1)`, [id]);
    expect((await call(student, `select * from public.bookmarks where resource_id = $1`, [id])).rows).toEqual([]);
  });
});

describe('reports', () => {
  it('can be filed once per open report, are visible to the reporter and content admins only', async () => {
    const id = await create(editor, 'Report target resource', true);
    const rid = ((await call(student, `select public.report_resource($1,'broken-file','Page 3 is blank') as id`, [id])).rows[0] as any).id;
    expect(await failure(call(student, `select public.report_resource($1,'other')`, [id]))).toMatch(/conflict/);
    expect(await failure(call(student, `select public.report_resource($1,'not-a-reason')`, [id]))).toMatch(/invalid_input/);

    expect((await call(student, `select id from public.resource_reports`)).rows).toEqual([{ id: rid }]);
    expect((await call(other, `select id from public.resource_reports`)).rows).toEqual([]);
    expect((await call(moderator, `select id from public.resource_reports`)).rows).toEqual([]);
    expect((await call(editor, `select id from public.resource_reports where id = $1`, [rid])).rows.length).toBe(1);

    expect(await failure(call(student, `select public.resolve_report($1,'resolved')`, [rid]))).toMatch(/forbidden/);
    await call(editor, `select public.resolve_report($1,'resolved')`, [rid]);
    await expect(call(student, `select public.report_resource($1,'other')`, [id])).resolves.toBeTruthy(); // may report again once resolved
  });

  it('cannot target unpublished resources', async () => {
    const draft = await create(editor, 'Report target draft');
    expect(await failure(call(student, `select public.report_resource($1,'other')`, [draft]))).toMatch(/not_found/);
  });
});

describe('feedback', () => {
  it('is real: signed-in students can send it, only they and content staff can read it', async () => {
    const id = ((await call(student, `select public.submit_feedback('Please add the 2024 OS endsem paper','me@example.com') as id`)).rows[0] as any).id;
    expect((await call(student, `select message from public.feedback`)).rows).toEqual([{ message: 'Please add the 2024 OS endsem paper' }]);
    expect((await call(other, `select 1 from public.feedback`)).rows).toEqual([]);
    expect((await call(moderator, `select 1 from public.feedback`)).rows).toEqual([]);
    expect((await call(editor, `select id from public.feedback where id = $1`, [id])).rows.length).toBe(1);

    expect(await failure(call(student, `select public.resolve_feedback($1)`, [id]))).toMatch(/forbidden/);
    await call(editor, `select public.resolve_feedback($1)`, [id]);
    expect(await failure(call(editor, `select public.resolve_feedback($1)`, [id]))).toMatch(/not_found/);
  });

  it('needs an account, validates the text and is rate limited', async () => {
    expect(await failure(asAnon(db, () => db.query(`select public.submit_feedback('anonymous spam')`)))).toMatch(/permission denied/i);
    expect(await failure(call(other, `select public.submit_feedback('ab')`))).toMatch(/invalid_input/);
    expect(await failure(call(other, `insert into public.feedback (message) values ('direct insert')`))).toMatch(/permission denied/i);
    for (let i = 0; i < 5; i++) await call(other, `select public.submit_feedback($1)`, [`Feedback number ${i}`]);
    expect(await failure(call(other, `select public.submit_feedback('one too many')`))).toMatch(/rate_limited/);
  });
});

describe('preferences and attendance', () => {
  it('are private to their owner and validated', async () => {
    await call(student, `insert into public.user_preferences (user_id, default_academic_year, default_semester) values ($1,'second-year',3)`, [student]);
    await call(student, `update public.user_preferences set default_semester = 4, settings = '{"theme":"dark"}'::jsonb where user_id = $1`, [student]);
    expect((await call(student, `select default_semester from public.user_preferences`)).rows).toEqual([{ default_semester: 4 }]);
    expect((await call(other, `select * from public.user_preferences`)).rows).toEqual([]);
    expect(await failure(call(other, `insert into public.user_preferences (user_id) values ($1)`, [student]))).toMatch(/row-level security/i);
    expect(await failure(call(student, `update public.user_preferences set default_semester = 9`))).toMatch(/violates check/);
    expect((await call(other, `update public.user_preferences set default_semester = 1 where user_id = $1`, [student])).affectedRows).toBe(0);
  });

  it('stores each student’s attendance, never exposes it to others, and keeps counts consistent', async () => {
    const ins = (uid: string, name: string, attended = 28, total = 36) =>
      call(uid, `insert into public.attendance_courses (user_id, semester_type, session_label, course_name, attended, total, min_required_percent) values ($1,'Odd','2026-27',$2,$3,$4,75) returning id`, [uid, name, attended, total]);
    const row = (await ins(student, 'Data Structures')).rows[0] as any;

    expect(await failure(ins(student, 'Impossible', 40, 36))).toMatch(/attendance_attended_le_total|violates check/);
    expect(await failure(ins(student, 'Data Structures'))).toMatch(/duplicate key/);
    expect(await failure(call(other, `insert into public.attendance_courses (user_id, semester_type, session_label, course_name) values ($1,'Odd','2026-27','Forged')`, [student]))).toMatch(/row-level security/i);

    expect((await call(other, `select * from public.attendance_courses`)).rows).toEqual([]);
    expect((await call(other, `update public.attendance_courses set attended = 0 where id = $1`, [row.id])).affectedRows).toBe(0);
    expect((await call(other, `delete from public.attendance_courses where id = $1`, [row.id])).affectedRows).toBe(0);
    expect((await call(owner, `select * from public.attendance_courses`)).rows).toEqual([]); // not even the super admin
    expect(await failure(asAnon(db, () => db.query(`select * from public.attendance_courses`)))).toMatch(/permission denied/i);

    await call(student, `update public.attendance_courses set attended = 30, total = 38 where id = $1`, [row.id]);
    expect((await call(student, `select attended, total from public.attendance_courses where id = $1`, [row.id])).rows).toEqual([{ attended: 30, total: 38 }]);
    // user_id can't be reassigned to hand records to someone else
    expect(await failure(call(student, `update public.attendance_courses set user_id = $1 where id = $2`, [other, row.id]))).toMatch(/permission denied/i);
  });

  it('caps courses per student', async () => {
    const heavy = await makeUser(db, 'heavy');
    for (let i = 0; i < 60; i++) {
      await call(heavy, `insert into public.attendance_courses (user_id, semester_type, session_label, course_name) values ($1,'Odd','2026-27',$2)`, [heavy, `Course ${i}`]);
    }
    expect(await failure(call(heavy, `insert into public.attendance_courses (user_id, semester_type, session_label, course_name) values ($1,'Odd','2026-27','One more')`, [heavy]))).toMatch(/row-level security/i);
  });
});

void validatedUpload;
void putObject;

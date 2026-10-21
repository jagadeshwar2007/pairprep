import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon, asService, asUser, bootstrapSuperAdmin, createDb, failure, makeUser, putObject, rows, setRole,
  subjectId, submitLink, uuid, validatedUpload, validateUpload, type Db,
} from './harness';

let db: Db;
let owner: string;
let moderator: string;
let contentAdmin: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createDb();
  owner = await bootstrapSuperAdmin(db);
  moderator = await makeUser(db, 'moderator');
  contentAdmin = await makeUser(db, 'content-admin');
  alice = await makeUser(db, 'alice');
  bob = await makeUser(db, 'bob');
  await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'file_moderator')`, [moderator]));
  await asUser(db, owner, () => db.query(`select public.set_user_role($1, 'content_admin')`, [contentAdmin]));
});
afterAll(async () => {
  await db.close();
});

const status = async (id: string) =>
  (await rows<{ status: string }>(db, `select status from public.contributions where id = $1`, [id]))[0].status;
const call = (uid: string, sql: string, params: unknown[] = []) => asUser(db, uid, () => db.query(sql, params));

describe('submitting', () => {
  it('stores a pending submission with a first revision, private to the uploader', async () => {
    const id = await submitLink(db, alice);
    expect(await status(id)).toBe('pending');
    expect((await rows(db, `select revision from public.contribution_revisions where contribution_id = $1`, [id])).length).toBe(1);

    expect((await call(alice, `select id from public.contributions`)).rows.map((r: any) => r.id)).toContain(id);
    expect((await call(bob, `select id from public.contributions where id = $1`, [id])).rows).toEqual([]);
    expect((await call(bob, `select id from public.contribution_revisions where contribution_id = $1`, [id])).rows).toEqual([]);
    expect((await asAnon(db, () => db.query(`select 1 from public.resources`))).rows).toEqual([]);
  });

  it('cannot be written directly: no insert/update/delete on contributions', async () => {
    const id = await submitLink(db, alice);
    const subject = await subjectId(db);
    for (const sql of [
      `insert into public.contributions (submitted_by, subject_id, title, resource_type, external_url, status) values ('${alice}', '${subject}', 'forged approved', 'notes', 'https://example.org/x', 'approved')`,
      `update public.contributions set status = 'approved' where id = '${id}'`,
      `delete from public.contributions where id = '${id}'`,
      `insert into public.resources (subject_id, title, resource_type, external_url, status, published_at) values ('${subject}', 'forged resource', 'notes', 'https://example.org/x', 'published', now())`,
      `insert into public.contribution_reviews (contribution_id, revision, action) values ('${id}', 1, 'approve')`,
    ]) {
      expect(await failure(call(alice, sql))).toMatch(/permission denied/i);
    }
    expect(await status(id)).toBe('pending');
  });

  it('validates fields and external links', async () => {
    const subject = await subjectId(db);
    const submit = (over: Partial<Record<'title' | 'url' | 'type' | 'subject', string>>) =>
      call(alice, `select public.submit_contribution($1,$2,'d',$3,$4,null,null)`, [
        over.subject ?? subject, over.title ?? 'A valid title', over.type ?? 'notes', over.url ?? 'https://example.org/file.pdf',
      ]);
    expect(await failure(submit({ title: 'abc' }))).toMatch(/invalid_input/);
    expect(await failure(submit({ type: 'hacking' }))).toMatch(/invalid_input/);
    expect(await failure(submit({ subject: uuid() }))).toMatch(/invalid_input/);
    for (const url of [
      'http://example.org/a.pdf', 'javascript:alert(1)', 'data:text/html,<script>', 'ftp://example.org/a', 'https://localhost/a',
      'https://127.0.0.1/a', 'https://169.254.169.254/latest', 'https://user:pw@example.org/a', 'https://exa mple.org/a',
      'file:///etc/passwd', 'https://example.org/<script>',
    ]) {
      expect(await failure(submit({ url })), url).toMatch(/invalid_url/);
    }
    await expect(submit({ url: 'https://drive.google.com/file/d/1AbC/view?usp=sharing' })).resolves.toBeTruthy();
  });

  it('requires exactly one source', async () => {
    const subject = await subjectId(db);
    expect(await failure(call(alice, `select public.submit_contribution($1,'A valid title','d','notes',null,null,null)`, [subject]))).toMatch(/invalid_input/);
    expect(await failure(call(alice, `select public.submit_contribution($1,'A valid title','d','notes','https://example.org/a',$2,null)`, [subject, `${alice}/${uuid()}.pdf`]))).toMatch(/invalid_input/);
  });

  it('rate limits students with too many open submissions', async () => {
    const carol = await makeUser(db, 'carol');
    for (let i = 0; i < 10; i++) await submitLink(db, carol, { title: `Open submission ${i}` });
    expect(await failure(submitLink(db, carol, { title: 'One too many' }))).toMatch(/rate_limited/);
  });

  it('refuses suspended accounts', async () => {
    const dave = await makeUser(db, 'dave');
    await asUser(db, owner, () => db.query(`select public.set_account_status($1,'suspended','abuse')`, [dave]));
    expect(await failure(submitLink(db, dave))).toMatch(/account_inactive/);
  });
});

describe('uploaded files', () => {
  it('need a server-side validation record before they can be submitted', async () => {
    const subject = await subjectId(db);
    const path = `${alice}/${uuid()}.pdf`;
    await asUser(db, alice, () => db.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ('contributions-private', $1, $2, '{"size":2048}'::jsonb)`, [path, alice]));
    const submit = () => call(alice, `select public.submit_contribution($1,'Uploaded notes','d','notes',null,$2,null)`, [subject, path]);
    expect(await failure(submit())).toMatch(/upload_not_validated/);

    await validateUpload(db, 'contributions-private', path, alice);
    const id = (await submit()).rows[0] as any;
    expect(id).toBeTruthy();

    // A validated upload is single-use.
    expect(await failure(submit())).toMatch(/upload_already_used/);
  });

  it("cannot be claimed through someone else's path or validation", async () => {
    const subject = await subjectId(db);
    const bobsPath = await validatedUpload(db, bob);
    expect(await failure(call(alice, `select public.submit_contribution($1,'Stolen upload','d','notes',null,$2,null)`, [subject, bobsPath]))).toMatch(/forbidden/);
    // alice has no object at a path inside bob's folder, and bob's folder is not hers to write:
    expect(await failure(asUser(db, alice, () => db.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ('contributions-private', $1, $2, '{}'::jsonb)`, [`${bob}/${uuid()}.pdf`, alice])))).toMatch(/row-level security/i);
  });

  it('cannot be swapped after validation (TOCTOU)', async () => {
    const subject = await subjectId(db);
    const path = await validatedUpload(db, alice);
    // Simulate the object being replaced by a different one at the same path.
    await db.query(`delete from storage.objects where bucket_id = 'contributions-private' and name = $1`, [path]);
    await putObject(db, 'contributions-private', path);
    expect(await failure(call(alice, `select public.submit_contribution($1,'Swapped upload','d','notes',null,$2,null)`, [subject, path]))).toMatch(/upload_changed/);
  });

  it('are re-checked against the current allowed types and size limit', async () => {
    const subject = await subjectId(db);
    const path = `${alice}/${uuid()}.pptx`;
    await putObject(db, 'contributions-private', path, 4096, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(await failure(validateUpload(db, 'contributions-private', path, alice, { type: 'pptx', size: 4096 }))).toMatch(/file_type_not_allowed/);

    const big = `${alice}/${uuid()}.pdf`;
    await putObject(db, 'contributions-private', big, 30 * 1024 * 1024);
    expect(await failure(validateUpload(db, 'contributions-private', big, alice, { size: 30 * 1024 * 1024 }))).toMatch(/file_too_large/);

    const mismatch = `${alice}/${uuid()}.pdf`;
    await putObject(db, 'contributions-private', mismatch, 5000);
    expect(await failure(validateUpload(db, 'contributions-private', mismatch, alice, { size: 100 }))).toMatch(/Size mismatch/);

    // Admin enables pptx explicitly: now it validates and can be submitted.
    await asUser(db, owner, () => db.query(`select public.set_app_setting('allowed_file_types', '["pdf","png","jpg","docx","pptx"]'::jsonb)`));
    await validateUpload(db, 'contributions-private', path, alice, { type: 'pptx', size: 4096, name: 'deck.pptx' });
    await asUser(db, owner, () => db.query(`select public.set_app_setting('allowed_file_types', '["pdf","png","jpg","docx"]'::jsonb)`));
    expect(await failure(call(alice, `select public.submit_contribution($1,'Disabled again','d','notes',null,$2,null)`, [subject, path]))).toMatch(/file_type_not_allowed/);
  });

  it('cannot be validated by an API role', async () => {
    const path = `${alice}/${uuid()}.pdf`;
    await putObject(db, 'contributions-private', path);
    expect(await failure(asUser(db, alice, () => db.query(`select public.record_upload_validation('contributions-private',$1,$2,'pdf','application/pdf',2048,'a.pdf')`, [path, alice])))).toMatch(/permission denied/i);
    expect(await failure(asUser(db, alice, () => db.query(`insert into public.upload_validations (bucket, path, user_id, object_id, detected_type, mime_type, size_bytes, original_name) values ('contributions-private', $1, $2, gen_random_uuid(), 'pdf', 'application/pdf', 1, 'a.pdf')`, [path, alice])))).toMatch(/permission denied/i);
  });
});

describe('moderation workflow', () => {
  it('lets a moderator claim, request changes with feedback, and the student resubmit with history', async () => {
    const id = await submitLink(db, alice, { title: 'Operating systems unit 2 notes' });
    await call(moderator, `select public.claim_contribution($1)`, [id]);
    expect(await status(id)).toBe('in_review');

    expect(await failure(call(moderator, `select public.review_contribution($1,'request_changes','')`, [id]))).toMatch(/feedback_required/);
    await call(moderator, `select public.review_contribution($1,'request_changes','Please include the unit title page.')`, [id]);
    expect(await status(id)).toBe('changes_requested');

    // Student sees the feedback + outcome history.
    const mine = (await call(alice, `select status, review_feedback from public.contributions where id = $1`, [id])).rows[0] as any;
    expect(mine).toEqual({ status: 'changes_requested', review_feedback: 'Please include the unit title page.' });
    const history = (await call(alice, `select action, feedback from public.contribution_reviews where contribution_id = $1 order by created_at`, [id])).rows;
    expect(history).toEqual([{ action: 'request_changes', feedback: 'Please include the unit title page.' }]);

    // Resubmitting keeps both revisions and returns the item to the queue.
    const subject = await subjectId(db);
    const rev = (await call(alice, `select public.resubmit_contribution($1,$2,'Operating systems unit 2 notes v2','Now with title page','notes',true,null,null,null) as r`, [id, subject])).rows[0] as any;
    expect(rev.r).toBe(2);
    expect(await status(id)).toBe('pending');
    const revs = await rows(db, `select revision, title from public.contribution_revisions where contribution_id = $1 order by revision`, [id]);
    expect(revs).toEqual([
      { revision: 1, title: 'Operating systems unit 2 notes' },
      { revision: 2, title: 'Operating systems unit 2 notes v2' },
    ]);
  });

  it('only allows resubmission after changes were requested, and only by the owner', async () => {
    const id = await submitLink(db, alice);
    const subject = await subjectId(db);
    const resubmit = (uid: string) => call(uid, `select public.resubmit_contribution($1,$2,'Another valid title','d','notes',true,null,null,null)`, [id, subject]);
    expect(await failure(resubmit(alice))).toMatch(/invalid_state/);
    await call(moderator, `select public.review_contribution($1,'request_changes','Needs more detail')`, [id]);
    expect(await failure(resubmit(bob))).toMatch(/not_found/);
    await expect(resubmit(alice)).resolves.toBeTruthy();
  });

  it('keeps rejected contributions out of the public hub and blocks resubmission', async () => {
    const id = await submitLink(db, alice, { title: 'Rejected material here' });
    expect(await failure(call(moderator, `select public.review_contribution($1,'reject','')`, [id]))).toMatch(/feedback_required/);
    await call(moderator, `select public.review_contribution($1,'reject','Copyrighted textbook scan')`, [id]);
    expect(await status(id)).toBe('rejected');
    expect((await asAnon(db, () => db.query(`select 1 from public.resources`))).rows).toEqual([]);
    expect((await rows(db, `select 1 from public.resources where source_contribution_id = $1`, [id])).length).toBe(0);
    const subject = await subjectId(db);
    expect(await failure(call(alice, `select public.resubmit_contribution($1,$2,'Try again please','d','notes',true,null,null,null)`, [id, subject]))).toMatch(/invalid_state/);
    // finished reviews cannot be flipped
    expect(await failure(call(moderator, `select public.approve_contribution($1)`, [id]))).toMatch(/invalid_state/);
  });

  it('approves into exactly one published resource, and a repeat approval changes nothing', async () => {
    const id = await submitLink(db, alice, { title: 'Approved external notes', credit: 'Alice (CSE 2027)' });
    const first = (await call(moderator, `select public.approve_contribution($1,'Looks good') as rid`, [id])).rows[0] as any;
    expect(await status(id)).toBe('approved');

    const res = await rows<any>(db, `select * from public.resources where source_contribution_id = $1`, [id]);
    expect(res.length).toBe(1);
    expect(res[0]).toMatchObject({ id: first.rid, status: 'published', verified: true, credit: 'Alice (CSE 2027)', external_url: 'https://drive.google.com/file/d/abc123/view' });
    expect(res[0].published_by).toBe(moderator);
    expect(res[0].created_by).toBe(alice);

    expect(await failure(call(moderator, `select public.approve_contribution($1)`, [id]))).toMatch(/invalid_state/);
    expect((await rows(db, `select 1 from public.resources where source_contribution_id = $1`, [id])).length).toBe(1);

    // Public sees the resource but not who contributed it, beyond the opt-in credit.
    const pub = await asAnon(db, () => db.query(`select title, credit from public.resources where id = $1`, [first.rid]));
    expect(pub.rows).toEqual([{ title: 'Approved external notes', credit: 'Alice (CSE 2027)' }]);
    expect(await failure(asAnon(db, () => db.query(`select created_by from public.resources`)))).toMatch(/permission denied/i);
    expect(await failure(asAnon(db, () => db.query(`select source_contribution_id from public.resources`)))).toMatch(/permission denied/i);
    expect(await failure(asUser(db, bob, () => db.query(`select published_by from public.resources`)))).toMatch(/permission denied/i);
  });

  it('hosted files must be copied to published storage first, to the path the database dictates', async () => {
    const path = await validatedUpload(db, alice, 'unit 3 notes.pdf');
    const subject = await subjectId(db);
    const id = (await call(alice, `select public.submit_contribution($1,'Hosted file notes','d','notes',null,$2,null) as id`, [subject, path])).rows[0] as any;

    const publishPath = (await call(moderator, `select public.contribution_publish_path($1) as p`, [id.id])).rows[0] as any;
    expect(publishPath.p).toBe(`approved/${id.id}/unit_3_notes.pdf`);
    expect(await failure(call(moderator, `select public.approve_contribution($1)`, [id.id]))).toMatch(/published_file_missing/);

    await putObject(db, 'resources-published', publishPath.p);
    const rid = (await call(moderator, `select public.approve_contribution($1) as r`, [id.id])).rows[0] as any;
    const [res] = await rows<any>(db, `select storage_path, file_name, status from public.resources where id = $1`, [rid.r]);
    expect(res).toEqual({ storage_path: publishPath.p, file_name: 'unit 3 notes.pdf', status: 'published' });
  });

  it('blocks approval while a contribution is flagged, and hides flags from the student', async () => {
    const id = await submitLink(db, alice, { title: 'Possible duplicate upload' });
    expect(await failure(call(moderator, `select public.review_contribution($1,'flag','')`, [id]))).toMatch(/feedback_required/);
    await call(moderator, `select public.review_contribution($1,'flag','Looks like a duplicate of an existing resource')`, [id]);
    expect(await failure(call(moderator, `select public.approve_contribution($1)`, [id]))).toMatch(/flagged/);

    expect((await call(alice, `select * from public.contribution_flags`)).rows).toEqual([]);
    expect((await call(alice, `select * from public.contribution_reviews where contribution_id = $1`, [id])).rows).toEqual([]);
    expect((await call(moderator, `select reason from public.contribution_flags where contribution_id = $1`, [id])).rows.length).toBe(1);

    await call(moderator, `select public.review_contribution($1,'unflag')`, [id]);
    await expect(call(moderator, `select public.approve_contribution($1)`, [id])).resolves.toBeTruthy();
  });

  it('never lets anyone review their own submission, whatever their role', async () => {
    const own = await submitLink(db, moderator, { title: 'Moderator own submission' });
    const ownOwner = await submitLink(db, owner, { title: 'Super admin own submission' });
    for (const [uid, id] of [[moderator, own], [owner, ownOwner]] as const) {
      for (const sql of [
        `select public.claim_contribution($1)`,
        `select public.approve_contribution($1)`,
        `select public.review_contribution($1,'reject','self review')`,
      ]) {
        expect(await failure(call(uid, sql, [id]))).toMatch(/forbidden/);
      }
    }
  });

  it('enforces separate permissions: students, content admins and moderators cannot do each other\'s jobs', async () => {
    const id = await submitLink(db, alice, { title: 'Permission matrix check' });
    expect(await failure(call(bob, `select public.approve_contribution($1)`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(alice, `select public.approve_contribution($1)`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(contentAdmin, `select public.approve_contribution($1)`, [id]))).toMatch(/forbidden/);
    expect(await failure(call(contentAdmin, `select public.claim_contribution($1)`, [id]))).toMatch(/forbidden/);

    // Content admins cannot even see the private queue.
    expect((await call(contentAdmin, `select id from public.contributions where id = $1`, [id])).rows).toEqual([]);

    // Moderators cannot touch resources, users, settings or the audit log.
    const subject = await subjectId(db);
    expect(await failure(call(moderator, `select public.create_resource($1,'Moderator made this','d','notes','https://example.org/x',null)`, [subject]))).toMatch(/forbidden/);
    expect(await failure(call(moderator, `select public.set_app_setting('max_upload_bytes','1048576'::jsonb)`))).toMatch(/forbidden/);
    expect(await failure(call(moderator, `select public.set_user_role($1,'content_admin')`, [bob]))).toMatch(/forbidden/);
    expect((await call(moderator, `select count(*)::int as n from public.audit_logs`)).rows[0]).toEqual({ n: 0 });

    // A moderator sees people who submitted work, but not the rest of the user base.
    const bystander = await makeUser(db, 'bystander-who-never-submitted');
    const visible = (await call(moderator, `select id from public.profiles`)).rows.map((r: any) => r.id);
    expect(visible).toContain(alice);
    expect(visible).not.toContain(bystander);
    expect(visible).not.toContain(contentAdmin);
    expect((await call(moderator, `select count(*)::int as n from public.user_roles where user_id <> $1`, [moderator])).rows[0]).toEqual({ n: 0 });
  });

  it('lets moderators see uploader details and their own moderation history', async () => {
    const id = await submitLink(db, bob, { title: 'Uploader details check' });
    const seen = (await call(moderator, `select full_name, email from public.profiles where id = $1`, [bob])).rows[0] as any;
    expect(seen.full_name).toBe('bob');
    const own = (await call(moderator, `select count(*)::int as n from public.contribution_reviews where reviewer_id = $1`, [moderator])).rows[0] as any;
    expect(own.n).toBeGreaterThan(0);
    // Students can't see each other.
    expect((await call(alice, `select id from public.profiles where id = $1`, [bob])).rows).toEqual([]);
    void id;
  });

  it('serialises concurrent decisions: the second reviewer sees the finished state', async () => {
    const id = await submitLink(db, alice, { title: 'Race condition check' });
    const second = await makeUser(db, 'second-moderator');
    await setRole(db, second, 'file_moderator');
    await call(moderator, `select public.review_contribution($1,'reject','Not relevant to the syllabus')`, [id]);
    expect(await failure(call(second, `select public.approve_contribution($1)`, [id]))).toMatch(/invalid_state/);
    expect(await failure(call(second, `select public.review_contribution($1,'request_changes','Too late')`, [id]))).toMatch(/invalid_state/);
    expect(await status(id)).toBe('rejected');
  });
});

describe('withdrawing', () => {
  it('lets owners withdraw unreviewed work only, and records it', async () => {
    const id = await submitLink(db, alice, { title: 'Withdraw me please' });
    expect(await failure(call(bob, `select public.withdraw_contribution($1)`, [id]))).toMatch(/not_found/);
    await call(alice, `select public.withdraw_contribution($1)`, [id]);
    expect((await rows(db, `select 1 from public.contributions where id = $1`, [id])).length).toBe(0);
    expect((await rows(db, `select 1 from public.audit_logs where action = 'contribution.withdraw' and target_id = $1`, [id])).length).toBe(1);

    const approved = await submitLink(db, alice, { title: 'Approved cannot withdraw' });
    await call(moderator, `select public.approve_contribution($1)`, [approved]);
    expect(await failure(call(alice, `select public.withdraw_contribution($1)`, [approved]))).toMatch(/invalid_state/);
  });
});

describe('notifications', () => {
  it('tell the student about each outcome, are private, and can be marked read', async () => {
    const eve = await makeUser(db, 'eve');
    const a = await submitLink(db, eve, { title: 'Notify approved one' });
    const b = await submitLink(db, eve, { title: 'Notify rejected one' });
    const c = await submitLink(db, eve, { title: 'Notify changes one' });
    await call(moderator, `select public.approve_contribution($1)`, [a]);
    await call(moderator, `select public.review_contribution($1,'reject','Not suitable')`, [b]);
    await call(moderator, `select public.review_contribution($1,'request_changes','Fix the title')`, [c]);

    const mine = (await call(eve, `select type, message, read_at from public.notifications order by created_at`)).rows as any[];
    expect(mine.map((n) => n.type).sort()).toEqual(['contribution_approved', 'contribution_changes_requested', 'contribution_rejected']);
    expect(mine.every((n) => n.read_at === null)).toBe(true);
    expect((await call(bob, `select id from public.notifications where user_id = $1`, [eve])).rows).toEqual([]);

    expect((await call(eve, `select (public.my_access()->>'unread_notifications')::int as n`)).rows[0]).toEqual({ n: 3 });
    expect((await call(eve, `select public.mark_notifications_read() as n`)).rows[0]).toEqual({ n: 3 });
    expect((await call(eve, `select (public.my_access()->>'unread_notifications')::int as n`)).rows[0]).toEqual({ n: 0 });

    // Can't forge or edit notifications.
    expect(await failure(call(eve, `insert into public.notifications (user_id, type, title, message) values ($1,'role_changed','You are admin','x')`, [eve]))).toMatch(/permission denied/i);
    expect(await failure(call(eve, `update public.notifications set read_at = null`))).toMatch(/permission denied/i);
  });
});

describe('audit trail', () => {
  it('records every moderation action with the acting reviewer', async () => {
    const id = await submitLink(db, alice, { title: 'Audit trail check' });
    await call(moderator, `select public.claim_contribution($1)`, [id]);
    await call(moderator, `select public.review_contribution($1,'reject','Out of scope for this course')`, [id]);
    const log = await rows<any>(db, `select action, actor_id from public.audit_logs where target_id = $1 order by id`, [id]);
    expect(log).toEqual([
      { action: 'contribution.claim', actor_id: moderator },
      { action: 'contribution.reject', actor_id: moderator },
    ]);
  });
});

void asService;

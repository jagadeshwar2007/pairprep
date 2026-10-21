import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { body, createUser, fileId, installFakeDrive, params, request, resetEmulators, admin, type FakeDrive, type TestUser } from '../helpers/fixtures';
import { setDriveClient } from '@/lib/server/drive';
import * as publicList from '@/app/api/resources/route';
import * as publicFacets from '@/app/api/resources/facets/route';
import * as publicDetail from '@/app/api/resources/[id]/route';
import * as me from '@/app/api/me/route';
import * as submissions from '@/app/api/submissions/route';
import * as reviews from '@/app/api/reviews/route';
import * as decision from '@/app/api/reviews/[id]/decision/route';
import * as adminResources from '@/app/api/admin/resources/route';
import * as adminResource from '@/app/api/admin/resources/[id]/route';
import * as adminActions from '@/app/api/admin/resources/[id]/actions/route';
import * as adminAssign from '@/app/api/admin/resources/[id]/assign/route';
import * as adminStats from '@/app/api/admin/stats/route';
import * as adminUsers from '@/app/api/admin/users/route';
import * as adminUser from '@/app/api/admin/users/[uid]/route';
import * as adminImport from '@/app/api/admin/import/route';

let drive: FakeDrive;
let adminUser1: TestUser;
let reviewer: TestUser;
let student: TestUser;

const submission = (n: number, extra: Record<string, unknown> = {}) => ({
  title: `Data Structures endsem paper ${n}`,
  description: 'Endsem question paper',
  department: 'cse',
  semester: 3,
  subject: 'Data Structures',
  subjectCode: 'CS13101',
  academicYear: '2024-25',
  resourceType: 'pyq',
  driveRef: `https://drive.google.com/file/d/${fileId(n)}/view?usp=sharing`,
  ...extra,
});

async function submitAs(user: TestUser, n: number, extra: Record<string, unknown> = {}) {
  drive.addFile(fileId(n), { name: `DS endsem ${n}.pdf` });
  const res = await submissions.POST(request('/api/submissions', { token: user.token, body: submission(n, extra) }));
  expect(res.status).toBe(201);
  return (await body(res)).id as string;
}

async function assign(resourceId: string, reviewerUid: string, token = adminUser1.token) {
  return adminAssign.POST(
    request(`/api/admin/resources/${resourceId}/assign`, { token, body: { reviewerUid } }),
    params({ id: resourceId })
  );
}

async function reviewerAssignmentFor(user: TestUser, resourceId: string) {
  const res = await reviews.GET(request('/api/reviews', { token: user.token }));
  expect(res.status).toBe(200);
  const items = (await body(res)).items as Array<{ id: string; resourceId: string; status: string }>;
  return items.find((a) => a.resourceId === resourceId && a.status === 'assigned');
}

async function decide(user: TestUser, assignmentId: string, d: 'approve' | 'reject', comments?: string) {
  return decision.POST(
    request(`/api/reviews/${assignmentId}/decision`, { token: user.token, body: { decision: d, comments } }),
    params({ id: assignmentId })
  );
}

async function action(resourceId: string, act: string, token = adminUser1.token, reason?: string) {
  return adminActions.POST(
    request(`/api/admin/resources/${resourceId}/actions`, { token, body: { action: act, reason } }),
    params({ id: resourceId })
  );
}

/** Full happy path: submit -> assign -> approve -> publish. */
async function publishedResource(n: number) {
  const id = await submitAs(student, n);
  expect((await assign(id, reviewer.uid)).status).toBe(201);
  const a = await reviewerAssignmentFor(reviewer, id);
  expect((await decide(reviewer, a!.id, 'approve')).status).toBe(200);
  expect((await action(id, 'publish')).status).toBe(200);
  return id;
}

async function publicIds(query = '') {
  const res = await publicList.GET(request(`/api/resources${query}`));
  expect(res.status).toBe(200);
  return (await body(res)).items.map((r: { id: string }) => r.id) as string[];
}

beforeAll(() => {
  admin();
});

beforeEach(async () => {
  await resetEmulators();
  drive = installFakeDrive();
  adminUser1 = await createUser('admin1', 'admin');
  reviewer = await createUser('reviewer1', 'reviewer', { departments: ['cse'], subjects: [] });
  student = await createUser('student1');
});

describe('public library', () => {
  it('1/11. visitors see only approved + published resources, without signing in', async () => {
    const published = await publishedResource(1);
    const pending = await submitAs(student, 2);
    const approvedOnly = await submitAs(student, 3);
    await assign(approvedOnly, reviewer.uid);
    const a = await reviewerAssignmentFor(reviewer, approvedOnly);
    await decide(reviewer, a!.id, 'approve');

    expect(await publicIds()).toEqual([published]);
    for (const hidden of [pending, approvedOnly]) {
      const res = await publicDetail.GET(request(`/api/resources/${hidden}`), params({ id: hidden }));
      expect(res.status).toBe(404);
    }
    // Public payload must not leak internal identifiers.
    const res = await publicList.GET(request('/api/resources'));
    const item = (await body(res)).items[0];
    expect(item.uploadedBy).toBeUndefined();
    expect(item.approval).toBeUndefined();
    expect(item.driveFileId).toBeUndefined();
  });

  it('2/13. search, filters and pagination work over published data', async () => {
    const ids: string[] = [];
    for (let i = 1; i <= 5; i++) ids.push(await publishedResource(i));
    drive.addFile(fileId(50), { name: 'thermo.pdf' });
    const other = await submitAs(student, 50, {
      title: 'Thermodynamics midsem',
      department: 'me',
      subject: 'Thermodynamics',
      subjectCode: 'ME13101',
      academicYear: '2023-24',
      semester: 4,
    });
    await assign(other, (await createUser('mereviewer', 'reviewer', { departments: ['me'], subjects: [] })).uid);
    // (left unpublished on purpose)

    expect(await publicIds('?q=data%20struct')).toHaveLength(5);
    expect(await publicIds('?q=thermodynamics')).toHaveLength(0);
    expect(await publicIds('?department=cse&semester=3&type=pyq&year=2024-25&subject=CS13101')).toHaveLength(5);
    expect(await publicIds('?department=me')).toHaveLength(0);

    const page1 = await body(await publicList.GET(request('/api/resources?pageSize=2&page=1&sort=title')));
    const page3 = await body(await publicList.GET(request('/api/resources?pageSize=2&page=3&sort=title')));
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page3.items).toHaveLength(1);
    expect(page1.items[0].title).toBe('Data Structures endsem paper 1');

    const bad = await publicList.GET(request('/api/resources?semester=99'));
    expect(bad.status).toBe(400);

    const facets = await body(await publicFacets.GET());
    expect(facets.resourceTypes).toEqual(['pyq']);
    expect(facets.departments).toEqual(['cse']);
  });

  it('3. a published resource links to its real registered Drive file', async () => {
    const id = await publishedResource(7);
    const res = await publicDetail.GET(request(`/api/resources/${id}`), params({ id }));
    const data = await body(res);
    expect(data.availability).toBe('available');
    expect(data.resource.links.preview).toBe(`https://drive.google.com/file/d/${fileId(7)}/preview`);
    expect(data.resource.links.download).toBe(`https://drive.google.com/uc?export=download&id=${fileId(7)}`);
  });

  it('12. inaccessible Drive files produce a useful error, at registration and after publication', async () => {
    // Registration of a file that does not exist / is not shared
    const res = await submissions.POST(request('/api/submissions', { token: student.token, body: submission(99) }));
    expect(res.status).toBe(422);
    expect((await body(res)).error.message).toMatch(/does not exist or is not shared/);

    // Unsupported type
    drive.addFile(fileId(98), { mimeType: 'application/zip', name: 'x.zip' });
    const zip = await submissions.POST(request('/api/submissions', { token: student.token, body: submission(98) }));
    expect(zip.status).toBe(422);
    expect((await body(zip)).error.code).toBe('unsupported_file_type');

    // Published file later deleted from Drive
    const id = await publishedResource(8);
    drive.breakFile(fileId(8), 'not_found');
    setDriveClient(drive); // clears the availability cache
    const detail = await body(await publicDetail.GET(request(`/api/resources/${id}`), params({ id })));
    expect(detail.availability).toBe('not_found');
    expect(detail.availabilityMessage).toBe('fake not_found');
    expect(detail.resource.links.download).toBeNull();

    // Download restriction is respected
    const id2 = await publishedResource(9);
    drive.addFile(fileId(9), { downloadAllowed: false });
    setDriveClient(drive);
    const d2 = await body(await publicDetail.GET(request(`/api/resources/${id2}`), params({ id: id2 })));
    expect(d2.resource.links.download).toBeNull();
    expect(d2.resource.links.preview).toContain(fileId(9));
  });
});

describe('contributions and review workflow', () => {
  it('4. a signed-in contributor can submit; anonymous users cannot', async () => {
    drive.addFile(fileId(10));
    const anon = await submissions.POST(request('/api/submissions', { body: submission(10) }));
    expect(anon.status).toBe(401);

    const id = await submitAs(student, 11);
    const mine = await body(await submissions.GET(request('/api/submissions', { token: student.token })));
    expect(mine.items).toEqual([expect.objectContaining({ id, verificationStatus: 'pending', publicationStatus: 'draft' })]);

    // Duplicate Drive file is refused
    const dup = await submissions.POST(request('/api/submissions', { token: student.token, body: submission(11) }));
    expect(dup.status).toBe(409);
  });

  it('5/6. an assigned reviewer sees the review and records a decision with comments', async () => {
    const id = await submitAs(student, 12);
    expect((await assign(id, reviewer.uid)).status).toBe(201);
    const a = await reviewerAssignmentFor(reviewer, id);
    expect(a).toBeDefined();

    // Another reviewer cannot see or decide it
    const other = await createUser('reviewer2', 'reviewer');
    expect(await reviewerAssignmentFor(other, id)).toBeUndefined();
    expect((await decide(other, a!.id, 'approve')).status).toBe(403);

    // Rejection needs comments
    expect((await decide(reviewer, a!.id, 'reject')).status).toBe(400);
    const res = await decide(reviewer, a!.id, 'reject', 'Pages 3-4 are missing');
    expect(res.status).toBe(200);
    const after = await body(await adminResource.GET(request(`/api/admin/resources/${id}`, { token: adminUser1.token }), params({ id })));
    expect(after.resource.verificationStatus).toBe('rejected');
    expect(after.resource.rejectionReason).toBe('Pages 3-4 are missing');
    expect(after.assignments[0]).toEqual(expect.objectContaining({ decision: 'reject', comments: 'Pages 3-4 are missing', status: 'completed' }));

    // The contributor sees the outcome
    const mine = await body(await submissions.GET(request('/api/submissions', { token: student.token })));
    expect(mine.items[0].rejectionReason).toBe('Pages 3-4 are missing');

    // A closed review cannot be decided twice
    expect((await decide(reviewer, a!.id, 'approve')).status).toBe(409);
  });

  it('7. a reviewer cannot review their own submission', async () => {
    const id = await submitAs(reviewer, 13);
    const res = await assign(id, reviewer.uid);
    expect(res.status).toBe(403);
    expect((await body(res)).error.message).toMatch(/own submissions/);
  });

  it('reviewer scope is enforced', async () => {
    drive.addFile(fileId(14));
    const id = await submitAs(student, 14, { department: 'me' });
    const res = await assign(id, reviewer.uid); // reviewer scoped to cse
    expect(res.status).toBe(403);
  });

  it('8. reviewers cannot publish, assign or use admin APIs', async () => {
    const id = await submitAs(student, 15);
    await assign(id, reviewer.uid);
    const a = await reviewerAssignmentFor(reviewer, id);
    await decide(reviewer, a!.id, 'approve');

    expect((await action(id, 'publish', reviewer.token)).status).toBe(403);
    expect((await assign(id, reviewer.uid, reviewer.token)).status).toBe(403);
    expect((await adminStats.GET(request('/api/admin/stats', { token: reviewer.token }))).status).toBe(403);
    expect((await adminResources.GET(request('/api/admin/resources', { token: student.token }))).status).toBe(403);
    expect(await publicIds()).toEqual([]);

    // Admin can publish once approved
    expect((await action(id, 'publish')).status).toBe(200);
    expect(await publicIds()).toEqual([id]);
  });

  it('11. publication requires a completed approval from someone other than the uploader', async () => {
    const id = await submitAs(student, 16);
    const early = await action(id, 'publish');
    expect(early.status).toBe(403);
    expect((await body(early)).error.message).toMatch(/must approve/);

    // Admin-registered resource reviewed by the same admin is not allowed
    drive.addFile(fileId(17));
    const reg = await adminResources.POST(
      request('/api/admin/resources', { token: adminUser1.token, body: submission(17) })
    );
    expect(reg.status).toBe(201);
    const regId = (await body(reg)).resource.id;
    expect((await assign(regId, adminUser1.uid)).status).toBe(403);
  });

  it('admin can reject directly, unpublish and delete; changing the Drive file resets verification', async () => {
    const id = await publishedResource(18);
    expect((await action(id, 'reject', adminUser1.token, 'nope')).status).toBe(409);
    expect((await action(id, 'unpublish')).status).toBe(200);
    expect(await publicIds()).toEqual([]);

    drive.addFile(fileId(19));
    const patch = await adminResource.PATCH(
      request(`/api/admin/resources/${id}`, {
        method: 'PATCH',
        token: adminUser1.token,
        body: { title: 'Renamed paper', driveRef: fileId(19) },
      }),
      params({ id })
    );
    expect(patch.status).toBe(200);
    const updated = (await body(patch)).resource;
    expect(updated).toEqual(
      expect.objectContaining({ title: 'Renamed paper', subjectCode: 'CS13101', academicYear: '2024-25', driveFileId: fileId(19), verificationStatus: 'pending', publicationStatus: 'draft', approval: null })
    );

    expect((await action(id, 'reject', adminUser1.token, 'Wrong subject')).status).toBe(200);
    const del = await adminResource.DELETE(
      request(`/api/admin/resources/${id}`, { method: 'DELETE', token: adminUser1.token }),
      params({ id })
    );
    expect(del.status).toBe(200);
    // The Drive file can be registered again after deletion
    drive.addFile(fileId(19));
    expect(
      (await submissions.POST(request('/api/submissions', { token: student.token, body: submission(19) }))).status
    ).toBe(201);
  });

  it('overview statistics are computed from real records', async () => {
    await publishedResource(20);
    await submitAs(student, 21);
    const underReview = await submitAs(student, 22);
    await assign(underReview, reviewer.uid);
    const rejected = await submitAs(student, 23);
    await action(rejected, 'reject', adminUser1.token, 'duplicate');
    const stats = await body(await adminStats.GET(request('/api/admin/stats', { token: adminUser1.token })));
    expect(stats).toEqual({ total: 4, published: 1, pending: 1, underReview: 1, approvedAwaitingPublication: 0, rejected: 1 });
  });
});

describe('roles and privilege escalation', () => {
  it('9. an administrator can authorize and revoke reviewers with a scope', async () => {
    await me.GET(request('/api/me', { token: student.token })); // creates profile
    const res = await adminUser.PATCH(
      request(`/api/admin/users/${student.uid}`, {
        method: 'PATCH',
        token: adminUser1.token,
        body: { role: 'reviewer', reviewerScope: { departments: ['ece'], subjects: ['Signals'] } },
      }),
      params({ uid: student.uid })
    );
    expect(res.status).toBe(200);
    expect((await body(res)).profile).toEqual(
      expect.objectContaining({ role: 'reviewer', reviewerScope: { departments: ['ece'], subjects: ['signals'] } })
    );
    const profile = await body(await me.GET(request('/api/me', { token: student.token })));
    expect(profile.profile.role).toBe('reviewer');

    const users = await body(await adminUsers.GET(request('/api/admin/users', { token: adminUser1.token })));
    expect(users.items.map((u: { uid: string }) => u.uid)).toContain(student.uid);

    const revoke = await adminUser.PATCH(
      request(`/api/admin/users/${student.uid}`, { method: 'PATCH', token: adminUser1.token, body: { role: 'student' } }),
      params({ uid: student.uid })
    );
    expect((await body(revoke)).profile.role).toBe('student');
  });

  it('10. a user cannot grant themselves (or anyone) administrative access', async () => {
    const meRes = await body(await me.GET(request('/api/me', { token: student.token })));
    expect(meRes.profile.role).toBe('student');

    // Student calling the admin API on themselves
    const self = await adminUser.PATCH(
      request(`/api/admin/users/${student.uid}`, { method: 'PATCH', token: student.token, body: { role: 'admin' } }),
      params({ uid: student.uid })
    );
    expect(self.status).toBe(403);

    // Even an admin cannot mint admins through the API, or change their own role
    const viaApi = await adminUser.PATCH(
      request(`/api/admin/users/${student.uid}`, { method: 'PATCH', token: adminUser1.token, body: { role: 'admin' } }),
      params({ uid: student.uid })
    );
    expect(viaApi.status).toBe(403);
    const ownRole = await adminUser.PATCH(
      request(`/api/admin/users/${adminUser1.uid}`, { method: 'PATCH', token: adminUser1.token, body: { role: 'student' } }),
      params({ uid: adminUser1.uid })
    );
    expect(ownRole.status).toBe(403);

    // Smuggled privileged fields are rejected
    drive.addFile(fileId(30));
    const smuggled = await submissions.POST(
      request('/api/submissions', { token: student.token, body: { ...submission(30), publicationStatus: 'published', role: 'admin' } })
    );
    expect(smuggled.status).toBe(400);

    // Forged / garbage tokens are rejected
    const forged = await adminStats.GET(request('/api/admin/stats', { token: 'eyJhbGciOiJub25lIn0.eyJ1aWQiOiJ4In0.' }));
    expect(forged.status).toBe(401);
    const none = await adminStats.GET(request('/api/admin/stats'));
    expect(none.status).toBe(401);

    const after = await body(await me.GET(request('/api/me', { token: student.token })));
    expect(after.profile.role).toBe('student');
  });

  it('revoking a reviewer returns their open reviews to the queue', async () => {
    const id = await submitAs(student, 31);
    await assign(id, reviewer.uid);
    await adminUser.PATCH(
      request(`/api/admin/users/${reviewer.uid}`, { method: 'PATCH', token: adminUser1.token, body: { role: 'student' } }),
      params({ uid: reviewer.uid })
    );
    const r = await body(await adminResource.GET(request(`/api/admin/resources/${id}`, { token: adminUser1.token }), params({ id })));
    expect(r.resource.verificationStatus).toBe('pending');
    expect(r.assignments[0].status).toBe('cancelled');
    expect((await reviews.GET(request('/api/reviews', { token: reviewer.token }))).status).toBe(403);
  });
});

describe('Drive folder import', () => {
  it('imports supported files as pending, skips duplicates and reports problems', async () => {
    const folder = '16g1SvodQLuXZknBlNXjVJXmBMUkcmZ8V';
    const f = (n: number, name: string, path: string[], mimeType = 'application/pdf') => ({
      ...drive.addFile(fileId(n), { name, mimeType }),
      path,
    });
    drive.folders.set(folder, [
      f(40, 'Unit 01.pdf', ['1st Sem', 'Engineering Physics', 'Notes']),
      f(41, 'Endsem 2023-24.pdf', ['1st Sem', 'Engineering Physics', 'PYQ']),
      f(42, 'video.mp4', ['1st Sem'], 'video/mp4'),
      f(43, 'Readme.pdf', ['Misc']),
    ]);
    const run = (dryRun: boolean, token = adminUser1.token) =>
      adminImport.POST(
        request('/api/admin/import', {
          token,
          body: { folderRef: `https://drive.google.com/drive/folders/${folder}`, defaults: { department: 'common' }, dryRun },
        })
      );

    expect((await run(false, reviewer.token)).status).toBe(403);

    const dry = await body(await run(true));
    expect(dry.created).toHaveLength(2);
    expect((await body(await adminStats.GET(request('/api/admin/stats', { token: adminUser1.token })))).total).toBe(0);

    const report = await body(await run(false));
    expect(report.created).toHaveLength(2);
    expect(report.unsupported).toEqual([expect.objectContaining({ name: 'video.mp4' })]);
    expect(report.failed).toEqual([expect.objectContaining({ name: 'Readme.pdf' })]); // no semester
    expect(report.created[0].inferred).toEqual({ semester: 1, resourceType: 'notes', subject: 'Engineering Physics', academicYear: null });
    expect(report.created[1].inferred).toEqual(expect.objectContaining({ resourceType: 'pyq', academicYear: '2023-24' }));

    const again = await body(await run(false));
    expect(again.created).toHaveLength(0);
    expect(again.duplicates).toHaveLength(2);

    // Nothing imported is public
    expect(await publicIds()).toEqual([]);
    const { db } = admin();
    const snap = await db.collection('resources').get();
    expect(snap.docs.every((d) => d.get('verificationStatus') === 'pending' && d.get('publicationStatus') === 'draft')).toBe(true);
  });
});

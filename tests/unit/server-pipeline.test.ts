import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildZip, docxFiles, pptxFiles } from './zip-builder';

// ---------------------------------------------------------------------------------------------
// Fakes for the service-role client and the user-scoped client. No network, no Supabase.
// ---------------------------------------------------------------------------------------------
const state = vi.hoisted(() => ({
  admin: null as unknown,
  ctx: null as unknown,
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => state.admin,
  isAdminClientConfigured: () => true,
}));
vi.mock('@/lib/auth/action-context', () => ({ actionContext: vi.fn(async () => state.ctx) }));

import { validateAndRecordUpload } from '@/lib/files/validate';
import { approveContribution } from '@/actions/moderation';
import { finalizeUpload } from '@/actions/uploads';
import { actionContext } from '@/lib/auth/action-context';

const USER = '11111111-2222-3333-4444-555555555555';
const FILE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const enc = (s: string) => new TextEncoder().encode(s);

interface FakeObject { size?: number; mimetype?: string; bytes: Uint8Array }

function fakeAdmin(object: FakeObject | null, opts: { rpcError?: { message: string; details?: string } } = {}) {
  const calls = { removed: [] as string[], downloads: 0, rpc: [] as { name: string; args: Record<string, unknown> }[], copies: [] as unknown[][] };
  const client = {
    storage: {
      from: () => ({
        list: async (_folder: string, o: { search: string }) => ({
          data: object ? [{ name: o.search, metadata: { size: object.size ?? object.bytes.length, mimetype: object.mimetype } }] : [],
          error: null,
        }),
        download: async () => {
          calls.downloads++;
          return { data: new Blob([object?.bytes as BlobPart]), error: null };
        },
        remove: async (paths: string[]) => {
          calls.removed.push(...paths);
          return { error: null };
        },
        copy: async (...args: unknown[]) => {
          calls.copies.push(args);
          return { error: null };
        },
      }),
    },
    from: () => ({
      select: () => ({
        in: async () => ({
          data: [
            { key: 'allowed_file_types', value: ['pdf', 'png', 'jpg', 'docx'] },
            { key: 'max_upload_bytes', value: 1024 * 1024 },
          ],
        }),
      }),
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.rpc.push({ name, args });
      return { data: null, error: opts.rpcError ?? null };
    },
  };
  state.admin = client;
  return calls;
}

const pdfPath = `${USER}/${FILE_ID}.pdf`;
const validate = (path: string, name = 'My Notes.pdf', userId = USER, bucket: 'contributions-private' | 'resources-published' = 'contributions-private') =>
  validateAndRecordUpload({ bucket, path, userId, originalName: name });

describe('validateAndRecordUpload (server-side file checking)', () => {
  it('accepts a genuine PDF, records the DETECTED type and a sanitised display name', async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.7\n%%EOF'), mimetype: 'application/pdf' });
    const result = await validate(pdfPath, '../../evil/My Notes.html');
    expect(result).toMatchObject({ ok: true, kind: 'pdf', name: 'My Notes.pdf', mime: 'application/pdf' });
    expect(calls.removed).toEqual([]);
    expect(calls.rpc).toEqual([
      {
        name: 'record_upload_validation',
        args: expect.objectContaining({ p_bucket: 'contributions-private', p_path: pdfPath, p_user_id: USER, p_detected_type: 'pdf', p_original_name: 'My Notes.pdf' }),
      },
    ]);
  });

  it('rejects and DELETES a file whose contents do not match its extension (HTML renamed .pdf)', async () => {
    const calls = fakeAdmin({ bytes: enc('<html><script>alert(1)</script></html>'), mimetype: 'application/pdf' });
    const result = await validate(pdfPath);
    expect(result).toMatchObject({ ok: false, code: 'file_type_not_allowed' });
    expect(calls.removed).toEqual([pdfPath]);
    expect(calls.rpc).toEqual([]); // no validation record => the database will refuse to submit it
  });

  it('rejects a PDF uploaded under a .png name even though the declared MIME says image/png', async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'image/png' });
    expect(await validate(`${USER}/${FILE_ID}.png`)).toMatchObject({ ok: false });
    expect(calls.removed).toEqual([`${USER}/${FILE_ID}.png`]);
  });

  it('rejects when the browser-declared MIME type disagrees with the extension, without even downloading', async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'text/html' });
    expect(await validate(pdfPath)).toMatchObject({ ok: false, code: 'file_type_not_allowed' });
    expect(calls.downloads).toBe(0);
    expect(calls.removed).toEqual([pdfPath]);
  });

  it('rejects oversize files before downloading them', async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), size: 5 * 1024 * 1024, mimetype: 'application/pdf' });
    expect(await validate(pdfPath)).toMatchObject({ ok: false, code: 'file_too_large' });
    expect(calls.downloads).toBe(0);
    expect(calls.removed).toEqual([pdfPath]);
  });

  it('rejects empty files', async () => {
    const calls = fakeAdmin({ bytes: new Uint8Array(0), size: 0, mimetype: 'application/pdf' });
    expect(await validate(pdfPath)).toMatchObject({ ok: false });
    expect(calls.removed).toEqual([pdfPath]);
  });

  it('accepts a real docx but rejects macro-enabled, plain-zip and not-allowed (pptx) containers', async () => {
    const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const pptxMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const docxPath = `${USER}/${FILE_ID}.docx`;
    const pptxPath = `${USER}/${FILE_ID}.pptx`;

    let calls = fakeAdmin({ bytes: buildZip(docxFiles), mimetype: docxMime });
    expect(await validate(docxPath, 'lecture.docx')).toMatchObject({ ok: true, kind: 'docx' });
    expect(calls.removed).toEqual([]);

    calls = fakeAdmin({ bytes: buildZip({ ...docxFiles, 'word/vbaProject.bin': 'x' }), mimetype: docxMime });
    expect(await validate(docxPath)).toMatchObject({ ok: false });
    expect(calls.removed).toEqual([docxPath]);

    calls = fakeAdmin({ bytes: buildZip({ 'a.txt': 'x' }), mimetype: docxMime });
    expect(await validate(docxPath)).toMatchObject({ ok: false });
    expect(calls.removed).toEqual([docxPath]);

    // pptx is a supported format but disabled by default settings
    calls = fakeAdmin({ bytes: buildZip(pptxFiles), mimetype: pptxMime });
    expect(await validate(pptxPath)).toMatchObject({ ok: false, code: 'file_type_not_allowed' });
    expect(calls.removed).toEqual([pptxPath]);
  });

  it("refuses paths that aren't the caller's own and never touches storage", async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'application/pdf' });
    const someoneElse = '99999999-2222-3333-4444-555555555555';
    expect(await validate(`${someoneElse}/${FILE_ID}.pdf`)).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(await validate(`${USER}/../${someoneElse}/${FILE_ID}.pdf`)).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(await validate(`uploads/${USER}/${FILE_ID}.pdf`)).toMatchObject({ ok: false, code: 'invalid_input' }); // wrong bucket layout
    expect(calls.removed).toEqual([]);
    expect(calls.rpc).toEqual([]);
  });

  it('reports a missing object instead of pretending it was checked', async () => {
    fakeAdmin(null);
    expect(await validate(pdfPath)).toMatchObject({ ok: false, code: 'not_found' });
  });

  it("deletes the object and surfaces the database's refusal when recording fails", async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'application/pdf' }, { rpcError: { message: 'account_inactive', details: 'Account is not permitted to upload.' } });
    expect(await validate(pdfPath)).toMatchObject({ ok: false, code: 'account_inactive', error: 'Account is not permitted to upload.' });
    expect(calls.removed).toEqual([pdfPath]);
  });
});

describe('finalizeUpload (action)', () => {
  beforeEach(() => {
    vi.mocked(actionContext).mockClear();
    state.ctx = { ok: true, supabase: {}, access: { userId: USER } };
  });

  it('requires resource permissions for the published bucket but not for the private one', async () => {
    fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'application/pdf' });
    await finalizeUpload({ bucket: 'contributions-private', path: pdfPath, originalName: 'a.pdf' });
    expect(actionContext).toHaveBeenLastCalledWith({ anyOf: undefined });
    await finalizeUpload({ bucket: 'resources-published', path: `uploads/${USER}/${FILE_ID}.pdf`, originalName: 'a.pdf' });
    expect(actionContext).toHaveBeenLastCalledWith({ anyOf: ['resources.create', 'resources.edit'] });
  });

  it('returns the auth failure untouched and never validates for an unauthorised caller', async () => {
    const calls = fakeAdmin({ bytes: enc('%PDF-1.4'), mimetype: 'application/pdf' });
    state.ctx = { ok: false, code: 'forbidden', error: "You don't have permission to do that." };
    const result = await finalizeUpload({ bucket: 'resources-published', path: `uploads/${USER}/${FILE_ID}.pdf`, originalName: 'a.pdf' });
    expect(result).toEqual({ ok: false, code: 'forbidden', error: "You don't have permission to do that." });
    expect(calls.rpc).toEqual([]);
    expect(calls.downloads).toBe(0);
  });

  it('validates its input shape', async () => {
    expect(await finalizeUpload({ bucket: 'somewhere-else', path: 'x', originalName: 'y' })).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(await finalizeUpload(null)).toMatchObject({ ok: false });
  });
});

// ---------------------------------------------------------------------------------------------
// approveContribution: the copy-then-approve sequence
// ---------------------------------------------------------------------------------------------
// Well-formed v4 UUIDs: zod's .uuid() is strict about version and variant digits.
const CID = '3f2b8c1e-5a7d-4e9a-8b6c-1d2e3f4a5b6c';
const MOD = 'c0ffee00-1111-4222-8333-444444444444';

function fakeUserClient(opts: {
  contribution: { id: string; status: string; submitted_by: string; storage_path: string | null; external_url: string | null } | null;
  flagged?: boolean;
  approveError?: { message: string; details?: string };
}) {
  const rpcLog: string[] = [];
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === 'contributions'
              ? { data: opts.contribution, error: null }
              : { data: opts.flagged ? { contribution_id: CID } : null, error: null },
        }),
      }),
    }),
    rpc: async (name: string) => {
      rpcLog.push(name);
      if (name === 'contribution_publish_path') return { data: `approved/${CID}/notes.pdf`, error: null };
      if (name === 'approve_contribution') return opts.approveError ? { data: null, error: opts.approveError } : { data: 'resource-1', error: null };
      return { data: null, error: null };
    },
  };
  state.ctx = { ok: true, supabase: client, access: { userId: MOD } };
  return rpcLog;
}

describe('approveContribution (action)', () => {
  const hosted = { id: CID, status: 'pending', submitted_by: 'student-1', storage_path: `student-1/${FILE_ID}.pdf`, external_url: null };

  it('copies the file to the database-dictated path BEFORE the transactional approval', async () => {
    const admin = fakeAdmin(null);
    const rpcLog = fakeUserClient({ contribution: hosted });
    const result = await approveContribution({ id: CID, feedback: 'Looks good' });
    expect(result).toMatchObject({ ok: true, data: { resourceId: 'resource-1' } });
    expect(admin.copies).toEqual([[`student-1/${FILE_ID}.pdf`, `approved/${CID}/notes.pdf`, { destinationBucket: 'resources-published' }]]);
    expect(rpcLog).toEqual(['contribution_publish_path', 'approve_contribution']);
  });

  it('does not copy anything for external links', async () => {
    const admin = fakeAdmin(null);
    const rpcLog = fakeUserClient({ contribution: { ...hosted, storage_path: null, external_url: 'https://example.org/a.pdf' } });
    expect(await approveContribution({ id: CID })).toMatchObject({ ok: true });
    expect(admin.copies).toEqual([]);
    expect(rpcLog).toEqual(['approve_contribution']);
  });

  it('refuses before copying when it is the reviewer\'s own submission, already decided, flagged or missing', async () => {
    for (const [contribution, flagged, code] of [
      [{ ...hosted, submitted_by: MOD }, false, 'forbidden'],
      [{ ...hosted, status: 'approved' }, false, 'invalid_state'],
      [{ ...hosted, status: 'rejected' }, false, 'invalid_state'],
      [hosted, true, 'flagged'],
      [null, false, 'not_found'],
    ] as const) {
      const admin = fakeAdmin(null);
      const rpcLog = fakeUserClient({ contribution, flagged });
      expect(await approveContribution({ id: CID }), code).toMatchObject({ ok: false, code });
      expect(admin.copies, `${code}: nothing may be copied`).toEqual([]);
      expect(rpcLog.includes('approve_contribution'), `${code}: approval must not run`).toBe(false);
    }
  });

  it("surfaces the database's refusal (e.g. a concurrent approval) and keeps the copied file", async () => {
    const admin = fakeAdmin(null);
    fakeUserClient({ contribution: hosted, approveError: { message: 'invalid_state', details: 'This contribution has already been reviewed.' } });
    const result = await approveContribution({ id: CID });
    expect(result).toEqual({ ok: false, code: 'invalid_state', error: 'This contribution has already been reviewed.' });
    // The deterministic target path is shared with the winning approval, so it must not be deleted.
    expect(admin.removed).toEqual([]);
  });

  it('tolerates the copy already existing from an earlier attempt, but stops on real copy failures', async () => {
    const admin = fakeAdmin(null);
    (state.admin as { storage: { from: () => { copy: unknown } } }).storage.from = () => ({
      copy: async () => ({ error: { message: 'The resource already exists' } }),
    });
    const rpcLog = fakeUserClient({ contribution: hosted });
    expect(await approveContribution({ id: CID })).toMatchObject({ ok: true });
    expect(rpcLog).toContain('approve_contribution');

    (state.admin as { storage: { from: () => { copy: unknown } } }).storage.from = () => ({
      copy: async () => ({ error: { message: 'connection reset' } }),
    });
    const rpcLog2 = fakeUserClient({ contribution: hosted });
    expect(await approveContribution({ id: CID })).toMatchObject({ ok: false, code: 'unknown' });
    expect(rpcLog2.includes('approve_contribution')).toBe(false);
    void admin;
  });

  it('requires the approve permission and validates input', async () => {
    state.ctx = { ok: false, code: 'forbidden', error: "You don't have permission to do that." };
    expect(await approveContribution({ id: CID })).toMatchObject({ ok: false, code: 'forbidden' });
    expect(vi.mocked(actionContext)).toHaveBeenLastCalledWith({ anyOf: ['contributions.approve'] });
    expect(await approveContribution({ id: 'not-a-uuid' })).toMatchObject({ ok: false, code: 'invalid_input' });
  });
});

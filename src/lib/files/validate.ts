import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { describeDbError, logServerError } from '@/lib/errors';
import {
  DEFAULT_ALLOWED_KINDS,
  DEFAULT_MAX_UPLOAD_BYTES,
  FILE_KIND_INFO,
  HARD_MAX_UPLOAD_BYTES,
  isFileKind,
  isValidUploadPath,
  kindFromMime,
  sanitizeFileName,
  type FileKind,
} from './registry';
import { sniffFile } from './sniff';

export type ValidatedUpload =
  | { ok: true; kind: FileKind; name: string; size: number; mime: string }
  | { ok: false; code: string; error: string };

export interface UploadLimits {
  allowedKinds: FileKind[];
  maxBytes: number;
}

/** Reads the (publicly readable) upload limits through the service client; never throws. */
export async function loadUploadLimits(): Promise<UploadLimits> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('app_settings')
      .select('key, value')
      .in('key', ['allowed_file_types', 'max_upload_bytes']);
    const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value]));
    const kinds = byKey.get('allowed_file_types');
    const max = byKey.get('max_upload_bytes');
    return {
      allowedKinds: Array.isArray(kinds) ? (kinds.filter(isFileKind) as FileKind[]) : DEFAULT_ALLOWED_KINDS,
      maxBytes: typeof max === 'number' ? Math.min(max, HARD_MAX_UPLOAD_BYTES) : DEFAULT_MAX_UPLOAD_BYTES,
    };
  } catch (error) {
    logServerError('uploads.limits', error);
    return { allowedKinds: DEFAULT_ALLOWED_KINDS, maxBytes: DEFAULT_MAX_UPLOAD_BYTES };
  }
}

/**
 * Server-side validation of an object the browser just uploaded.
 *
 *   1. the path must have exactly the shape the storage policy allows for this user,
 *   2. the stored size / declared MIME type are read from Storage (not from the client),
 *   3. the bytes are downloaded and identified by CONTENT (magic bytes / container structure),
 *   4. only then is a validation record written (service role); submit_contribution and
 *      create_resource refuse any file that does not have one.
 *
 * A rejected object is deleted immediately so nothing unvalidated lingers in the bucket.
 * The caller must already have authorised `userId` (and, for the published bucket, the permission).
 */
export async function validateAndRecordUpload(params: {
  bucket: 'contributions-private' | 'resources-published';
  path: string;
  userId: string;
  originalName: string;
}): Promise<ValidatedUpload> {
  const { bucket, path, userId, originalName } = params;

  if (!isValidUploadPath(bucket, userId, path)) {
    return { ok: false, code: 'invalid_input', error: 'Invalid upload location.' };
  }

  const admin = createAdminClient();
  const reject = async (code: string, error: string): Promise<ValidatedUpload> => {
    const { error: removeError } = await admin.storage.from(bucket).remove([path]);
    if (removeError) logServerError('uploads.remove-rejected', removeError);
    return { ok: false, code, error };
  };

  const limits = await loadUploadLimits();

  // Size and declared type come from Storage itself.
  const slash = path.lastIndexOf('/');
  const folder = path.slice(0, slash);
  const file = path.slice(slash + 1);
  const { data: listing, error: listError } = await admin.storage.from(bucket).list(folder, { search: file, limit: 10 });
  if (listError) {
    logServerError('uploads.list', listError);
    return { ok: false, code: 'unknown', error: 'Could not read the uploaded file. Please try again.' };
  }
  const object = listing?.find((o) => o.name === file);
  if (!object) return { ok: false, code: 'not_found', error: 'The uploaded file could not be found. Please upload it again.' };

  const size = Number(object.metadata?.size ?? 0);
  const declaredMime = String(object.metadata?.mimetype ?? '');
  if (!Number.isFinite(size) || size <= 0) return reject('invalid_input', 'The file is empty.');
  if (size > limits.maxBytes) {
    return reject('file_too_large', `Files can be at most ${Math.floor(limits.maxBytes / (1024 * 1024))} MB.`);
  }

  const extension = file.split('.').pop() ?? '';
  const claimedKind = isFileKind(extension) ? extension : null;
  if (!claimedKind || kindFromMime(declaredMime) !== claimedKind) {
    return reject('file_type_not_allowed', 'The file type does not match its declared format.');
  }

  const { data: blob, error: downloadError } = await admin.storage.from(bucket).download(path);
  if (downloadError || !blob) {
    logServerError('uploads.download', downloadError);
    return { ok: false, code: 'unknown', error: 'Could not read the uploaded file. Please try again.' };
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const sniffed = sniffFile(bytes);
  if (sniffed.kind === null) return reject('file_type_not_allowed', `This file was rejected: ${sniffed.reason}.`);
  if (sniffed.kind !== claimedKind) {
    return reject('file_type_not_allowed', 'The file contents do not match its extension.');
  }
  if (!limits.allowedKinds.includes(sniffed.kind)) {
    return reject('file_type_not_allowed', `${FILE_KIND_INFO[sniffed.kind].label} files are not currently accepted.`);
  }

  const name = sanitizeFileName(originalName, sniffed.kind);
  const mime = FILE_KIND_INFO[sniffed.kind].mime;
  const { error: rpcError } = await admin.rpc('record_upload_validation', {
    p_bucket: bucket,
    p_path: path,
    p_user_id: userId,
    p_detected_type: sniffed.kind,
    p_mime_type: mime,
    p_size_bytes: size,
    p_original_name: name,
  });
  if (rpcError) {
    const described = describeDbError(rpcError);
    if (described.code === 'unknown') logServerError('uploads.record', rpcError);
    return reject(described.code, described.message);
  }

  return { ok: true, kind: sniffed.kind, name, size, mime };
}

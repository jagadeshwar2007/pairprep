// The only file kinds the platform understands. Everything else is rejected, whatever its
// extension or declared MIME type. Keep in sync with the DB check on upload_validations.detected_type,
// the storage bucket MIME allowlists and the `allowed_file_types` setting validation.

export const FILE_KINDS = ['pdf', 'png', 'jpg', 'docx', 'pptx'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export interface FileKindInfo {
  ext: string;
  mime: string;
  label: string;
  /** Can be rendered inline in the browser (PDF viewer / <img>). */
  previewable: boolean;
}

export const FILE_KIND_INFO: Record<FileKind, FileKindInfo> = {
  pdf: { ext: 'pdf', mime: 'application/pdf', label: 'PDF', previewable: true },
  png: { ext: 'png', mime: 'image/png', label: 'PNG image', previewable: true },
  jpg: { ext: 'jpg', mime: 'image/jpeg', label: 'JPEG image', previewable: true },
  docx: {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word document',
    previewable: false,
  },
  pptx: {
    ext: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    label: 'PowerPoint',
    previewable: false,
  },
};

/** Enabled out of the box. pptx is supported but must be switched on by the super admin. */
export const DEFAULT_ALLOWED_KINDS: FileKind[] = ['pdf', 'png', 'jpg', 'docx'];
export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const HARD_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function isFileKind(value: unknown): value is FileKind {
  return typeof value === 'string' && (FILE_KINDS as readonly string[]).includes(value);
}

/** Best-effort guess from the file name. Used for UX only; the server never trusts it. */
export function kindFromFileName(name: string): FileKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'jpeg') return 'jpg';
  return isFileKind(ext) ? ext : null;
}

export function kindFromMime(mime: string | null | undefined): FileKind | null {
  return FILE_KINDS.find((k) => FILE_KIND_INFO[k].mime === mime) ?? null;
}

/**
 * Produces a safe display name: no path segments, control characters or exotic symbols, a
 * bounded length, and the canonical extension for the DETECTED kind (never the claimed one).
 */
export function sanitizeFileName(original: string, kind: FileKind): string {
  const base = (original.split(/[\\/]/).pop() ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const cleaned = base
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._()-]+/gu, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[. _-]+|[. _-]+$/g, '')
    .slice(0, 100);
  return `${cleaned || 'file'}.${FILE_KIND_INFO[kind].ext}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Builds the exact path shape the storage policies and RPCs accept. */
export function newUploadPath(bucket: 'contributions-private' | 'resources-published', userId: string, kind: FileKind): string {
  const id = crypto.randomUUID();
  return bucket === 'contributions-private'
    ? `${userId}/${id}.${FILE_KIND_INFO[kind].ext}`
    : `uploads/${userId}/${id}.${FILE_KIND_INFO[kind].ext}`;
}

export function isValidUploadPath(bucket: string, userId: string, path: string): boolean {
  const ext = '(pdf|png|jpg|docx|pptx)';
  const re =
    bucket === 'contributions-private'
      ? new RegExp(`^${userId}/${UUID}\\.${ext}$`)
      : bucket === 'resources-published'
        ? new RegExp(`^uploads/${userId}/${UUID}\\.${ext}$`)
        : null;
  return Boolean(re && /^[0-9a-f-]{36}$/.test(userId) && re.test(path));
}

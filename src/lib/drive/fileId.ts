// Pure helpers for turning user input into a validated Google Drive file/folder ID.
// Only Google-owned Drive/Docs hosts are accepted; arbitrary URLs are rejected so the
// app never links to (or proxies) content from an unvetted origin.

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

const ALLOWED_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

export function isValidDriveId(id: string): boolean {
  return DRIVE_ID_PATTERN.test(id);
}

export type DriveRefKind = 'file' | 'folder';

export interface ParsedDriveRef {
  id: string;
  kind: DriveRefKind | 'unknown';
}

/**
 * Accepts a bare Drive ID or a Drive/Docs URL and returns the ID it refers to.
 * Returns null for anything that is not a recognisable Google Drive reference.
 */
export function parseDriveReference(input: string): ParsedDriveRef | null {
  const raw = input.trim();
  if (!raw) return null;

  if (isValidDriveId(raw)) return { id: raw, kind: 'unknown' };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    return null;
  }

  const path = url.pathname;
  const patterns: Array<[RegExp, DriveRefKind]> = [
    [/^\/file\/d\/([^/]+)/, 'file'],
    [/^\/drive\/(?:u\/\d+\/)?folders\/([^/]+)/, 'folder'],
    [/^\/(?:document|presentation|spreadsheets|forms)\/d\/([^/]+)/, 'file'],
  ];
  for (const [re, kind] of patterns) {
    const m = path.match(re);
    if (m && isValidDriveId(m[1])) return { id: m[1], kind };
  }

  // Legacy forms: /open?id=..., /uc?id=...
  if (path === '/open' || path === '/uc') {
    const id = url.searchParams.get('id');
    if (id && isValidDriveId(id)) return { id, kind: 'unknown' };
  }
  return null;
}

export function extractDriveFileId(input: string): string | null {
  const ref = parseDriveReference(input);
  if (!ref || ref.kind === 'folder') return null;
  return ref.id;
}

export function extractDriveFolderId(input: string): string | null {
  const ref = parseDriveReference(input);
  if (!ref || ref.kind === 'file') return null;
  return ref.id;
}

const GOOGLE_EXPORT_PATH: Record<string, string> = {
  'application/vnd.google-apps.document': 'document',
  'application/vnd.google-apps.presentation': 'presentation',
  'application/vnd.google-apps.spreadsheet': 'spreadsheets',
};

/** Links into Drive's own viewer. The ID is re-validated so a bad value can never form a URL. */
export function buildDriveLinks(fileId: string, mimeType: string, downloadAllowed: boolean) {
  if (!isValidDriveId(fileId)) throw new Error('Invalid Drive file id');
  const id = encodeURIComponent(fileId);
  const exportPath = GOOGLE_EXPORT_PATH[mimeType];
  const download = !downloadAllowed
    ? null
    : exportPath
      ? `https://docs.google.com/${exportPath}/d/${id}/export?format=pdf`
      : `https://drive.google.com/uc?export=download&id=${id}`;
  return {
    preview: `https://drive.google.com/file/d/${id}/preview`,
    open: `https://drive.google.com/file/d/${id}/view`,
    download,
  };
}

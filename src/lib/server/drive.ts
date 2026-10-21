import 'server-only';
import { GoogleAuth } from 'google-auth-library';
import { isValidDriveId } from '@/lib/drive/fileId';
import { isSupportedMimeType } from '@/lib/resources/constants';
import type { DriveAvailability } from '@/lib/resources/types';

// Server-side Google Drive access. Only metadata is read; file bytes are never proxied.
// Students open files through Drive's own viewer, so Drive keeps enforcing the owner's
// sharing settings.
//
// Credentials (server env only):
//   GOOGLE_DRIVE_API_KEY            — API key; sees files shared "Anyone with the link".
//                                     Preferred: a successful lookup proves students can open it.
//   GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY — service-account JSON (raw or base64) with read access
//                                     to the folders you share with it. Used when no API key.

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedTime: string | null;
  trashed: boolean;
  downloadAllowed: boolean;
  parents: string[];
}

export type DriveLookupResult =
  | { ok: true; file: DriveFileMetadata; supported: boolean }
  | { ok: false; availability: Exclude<DriveAvailability, 'available'>; message: string };

export interface DriveFolderEntry extends DriveFileMetadata {
  path: string[];
}

export interface DriveClient {
  isConfigured(): boolean;
  getFile(fileId: string): Promise<DriveLookupResult>;
  listFolder(folderId: string, opts: { recursive: boolean; maxFiles: number }): Promise<{
    files: DriveFolderEntry[];
    truncated: boolean;
    errors: string[];
  }>;
}

const FILE_FIELDS =
  'id,name,mimeType,size,modifiedTime,trashed,copyRequiresWriterPermission,parents,shortcutDetails(targetId,targetMimeType)';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';
const API = 'https://www.googleapis.com/drive/v3';

interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  trashed?: boolean;
  copyRequiresWriterPermission?: boolean;
  parents?: string[];
  shortcutDetails?: { targetId: string; targetMimeType: string };
}

function toMetadata(raw: RawDriveFile): DriveFileMetadata {
  const size = raw.size ? Number(raw.size) : null;
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    sizeBytes: Number.isFinite(size) ? size : null,
    modifiedTime: raw.modifiedTime ?? null,
    trashed: Boolean(raw.trashed),
    downloadAllowed: !raw.copyRequiresWriterPermission,
    parents: raw.parents ?? [],
  };
}

class GoogleDriveRestClient implements DriveClient {
  private auth: GoogleAuth | null = null;

  constructor(
    private apiKey: string | undefined,
    serviceAccountKey: string | undefined
  ) {
    if (!apiKey && serviceAccountKey) {
      const text = serviceAccountKey.trim().startsWith('{')
        ? serviceAccountKey
        : Buffer.from(serviceAccountKey, 'base64').toString('utf8');
      this.auth = new GoogleAuth({
        credentials: JSON.parse(text),
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    }
  }

  isConfigured() {
    return Boolean(this.apiKey || this.auth);
  }

  private async request(path: string, params: Record<string, string>) {
    const url = new URL(`${API}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('supportsAllDrives', 'true');
    const headers: Record<string, string> = {};
    if (this.apiKey) url.searchParams.set('key', this.apiKey);
    else if (this.auth) {
      const token = await this.auth.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    return res;
  }

  async getFile(fileId: string): Promise<DriveLookupResult> {
    if (!isValidDriveId(fileId)) {
      return { ok: false, availability: 'not_found', message: 'That is not a valid Google Drive file ID.' };
    }
    if (!this.isConfigured()) {
      return {
        ok: false,
        availability: 'not_configured',
        message: 'Google Drive access is not configured on the server.',
      };
    }
    let res: Response;
    try {
      res = await this.request(`/files/${encodeURIComponent(fileId)}`, { fields: FILE_FIELDS });
    } catch {
      return { ok: false, availability: 'error', message: 'Google Drive could not be reached. Try again shortly.' };
    }
    if (res.status === 404) {
      return {
        ok: false,
        availability: 'not_found',
        message: 'The file does not exist or is not shared with "Anyone with the link".',
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        availability: 'forbidden',
        message: 'PairPrep does not have permission to read this file. Check its sharing settings.',
      };
    }
    if (!res.ok) {
      return { ok: false, availability: 'error', message: `Google Drive returned an error (${res.status}).` };
    }
    let raw = (await res.json()) as RawDriveFile;
    if (raw.mimeType === SHORTCUT_MIME && raw.shortcutDetails?.targetId) {
      return this.getFile(raw.shortcutDetails.targetId);
    }
    if (raw.mimeType === FOLDER_MIME) {
      return { ok: false, availability: 'unsupported', message: 'That link points to a folder, not a file.' };
    }
    raw = { ...raw, id: raw.id || fileId };
    const file = toMetadata(raw);
    if (file.trashed) {
      return { ok: false, availability: 'trashed', message: 'This file has been moved to the Drive trash.' };
    }
    return { ok: true, file, supported: isSupportedMimeType(file.mimeType) };
  }

  async listFolder(folderId: string, opts: { recursive: boolean; maxFiles: number }) {
    const files: DriveFolderEntry[] = [];
    const errors: string[] = [];
    let truncated = false;
    const queue: Array<{ id: string; path: string[]; depth: number }> = [{ id: folderId, path: [], depth: 0 }];
    const seenFolders = new Set<string>();

    while (queue.length > 0) {
      const folder = queue.shift()!;
      if (seenFolders.has(folder.id)) continue;
      seenFolders.add(folder.id);
      let pageToken: string | undefined;
      do {
        let res: Response;
        try {
          res = await this.request('/files', {
            q: `'${folder.id}' in parents and trashed = false`,
            fields: `nextPageToken,files(${FILE_FIELDS})`,
            pageSize: '200',
            includeItemsFromAllDrives: 'true',
            ...(pageToken ? { pageToken } : {}),
          });
        } catch {
          errors.push(`Could not reach Google Drive while listing ${folder.path.join('/') || 'the folder'}.`);
          break;
        }
        if (!res.ok) {
          errors.push(
            res.status === 404 || res.status === 403
              ? `Folder ${folder.path.join('/') || folderId} is not accessible (HTTP ${res.status}).`
              : `Drive returned HTTP ${res.status} for ${folder.path.join('/') || folderId}.`
          );
          break;
        }
        const body = (await res.json()) as { files?: RawDriveFile[]; nextPageToken?: string };
        for (const raw of body.files ?? []) {
          if (raw.mimeType === FOLDER_MIME) {
            if (opts.recursive && folder.depth < 5) {
              queue.push({ id: raw.id, path: [...folder.path, raw.name], depth: folder.depth + 1 });
            }
            continue;
          }
          if (files.length >= opts.maxFiles) {
            truncated = true;
            break;
          }
          files.push({ ...toMetadata(raw), path: folder.path });
        }
        pageToken = truncated ? undefined : body.nextPageToken;
      } while (pageToken);
      if (truncated) break;
    }
    return { files, truncated, errors };
  }
}

let client: DriveClient | undefined;

export function getDriveClient(): DriveClient {
  if (!client) {
    client = new GoogleDriveRestClient(
      process.env.GOOGLE_DRIVE_API_KEY || undefined,
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY || undefined
    );
  }
  return client;
}

/** Test seam: lets integration tests substitute a fake Drive. */
export function setDriveClient(c: DriveClient | undefined) {
  client = c;
  availabilityCache.clear();
}

const availabilityCache = new Map<string, { at: number; result: DriveLookupResult }>();
const AVAILABILITY_TTL_MS = 5 * 60 * 1000;

/** Cached lookup used on public detail pages so each view doesn't hit the Drive API. */
export async function checkAvailability(fileId: string): Promise<DriveLookupResult> {
  const hit = availabilityCache.get(fileId);
  if (hit && Date.now() - hit.at < AVAILABILITY_TTL_MS) return hit.result;
  const result = await getDriveClient().getFile(fileId);
  if (result.ok || result.availability !== 'error') {
    availabilityCache.set(fileId, { at: Date.now(), result });
  }
  return result;
}

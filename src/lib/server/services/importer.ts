import 'server-only';
import { adminDb } from '../firebaseAdmin';
import { ApiError, badRequest } from '../http';
import { getDriveClient } from '../drive';
import type { AuthContext } from '../auth';
import { DRIVE_INDEX, createResourceRecord, invalidateCatalogue } from './resources';
import { extractDriveFolderId } from '@/lib/drive/fileId';
import {
  inferAcademicYear,
  inferResourceType,
  inferSemester,
  inferSubject,
  inferUnit,
  titleFromFileName,
} from '@/lib/drive/inference';
import { isSupportedMimeType } from '@/lib/resources/constants';
import type { ImportFolderInput } from '@/lib/resources/validation';

const MAX_FILES_PER_IMPORT = 500;

export interface ImportReportItem {
  driveFileId: string;
  name: string;
  path: string;
  resourceId?: string;
  reason?: string;
  inferred?: { semester: number; resourceType: string; subject: string; academicYear: string | null };
}

export interface ImportReport {
  folderId: string;
  dryRun: boolean;
  scanned: number;
  truncated: boolean;
  created: ImportReportItem[];
  duplicates: ImportReportItem[];
  unsupported: ImportReportItem[];
  failed: ImportReportItem[];
  folderErrors: string[];
}

/**
 * Imports every supported file under a Drive folder as a *pending, unpublished* resource.
 * Duplicates (same Drive file ID) are skipped. Nothing is ever auto-published.
 */
export async function importDriveFolder(admin: AuthContext, input: ImportFolderInput): Promise<ImportReport> {
  const folderId = extractDriveFolderId(input.folderRef);
  if (!folderId) throw badRequest('Enter a Google Drive folder link or folder ID');
  const drive = getDriveClient();
  if (!drive.isConfigured()) {
    throw new ApiError(503, 'drive_not_configured', 'Google Drive access is not configured on the server.');
  }

  const listing = await drive.listFolder(folderId, { recursive: input.recursive, maxFiles: MAX_FILES_PER_IMPORT });
  const report: ImportReport = {
    folderId,
    dryRun: input.dryRun,
    scanned: listing.files.length,
    truncated: listing.truncated,
    created: [],
    duplicates: [],
    unsupported: [],
    failed: [],
    folderErrors: listing.errors,
  };

  const db = adminDb();
  for (const file of listing.files) {
    const item: ImportReportItem = { driveFileId: file.id, name: file.name, path: file.path.join(' / ') };
    if (!isSupportedMimeType(file.mimeType)) {
      report.unsupported.push({ ...item, reason: file.mimeType });
      continue;
    }
    const segments = [...file.path, file.name];
    const semester = inferSemester(segments) ?? input.defaults.semester ?? null;
    if (!semester) {
      report.failed.push({ ...item, reason: 'Could not determine the semester; set a default semester.' });
      continue;
    }
    const resourceType = inferResourceType(segments) ?? input.defaults.resourceType ?? 'other';
    const subject = input.defaults.subject || inferSubject(file.path) || 'Unsorted';
    const academicYear = inferAcademicYear(file.name) ?? input.defaults.academicYear ?? null;
    item.inferred = { semester, resourceType, subject, academicYear };

    const indexed = await db.collection(DRIVE_INDEX).doc(file.id).get();
    if (indexed.exists) {
      report.duplicates.push({ ...item, resourceId: indexed.get('resourceId'), reason: 'Already registered' });
      continue;
    }
    if (input.dryRun) {
      report.created.push(item);
      continue;
    }
    try {
      const resource = await createResourceRecord(
        {
          title: titleFromFileName(file.name),
          description: '',
          department: input.defaults.department,
          semester,
          subject,
          subjectCode: null,
          academicYear,
          resourceType,
          unit: inferUnit(file.name),
          keywords: file.path.map((p) => p.toLowerCase()).slice(0, 15),
        },
        file,
        admin,
        'import'
      );
      report.created.push({ ...item, resourceId: resource.id });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate_resource') {
        report.duplicates.push({ ...item, reason: 'Already registered' });
      } else {
        report.failed.push({ ...item, reason: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
  }
  invalidateCatalogue();
  return report;
}

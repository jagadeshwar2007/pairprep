import 'server-only';
import { FieldValue, type DocumentSnapshot, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin';
import { ApiError, badRequest, conflict, forbidden, notFound } from '../http';
import { toIso } from '../serialize';
import { checkAvailability, getDriveClient, type DriveFileMetadata } from '../drive';
import type { AuthContext } from '../auth';
import { buildDriveLinks, extractDriveFileId } from '@/lib/drive/fileId';
import { buildSearchText, computeFacets, searchResources } from '@/lib/resources/search';
import type {
  AdminStats,
  Paginated,
  PublicResource,
  Resource,
  ResourceFacets,
  ResourceSearchQuery,
  ResourceSource,
  ResourceType,
  VerificationStatus,
  PublicationStatus,
} from '@/lib/resources/types';
import type { UpdateResourceInput } from '@/lib/resources/validation';

export const RESOURCES = 'resources';
export const DRIVE_INDEX = 'driveFileIndex';
export const ASSIGNMENTS = 'reviewAssignments';

const MAX_OPEN_SUBMISSIONS_PER_USER = 25;

export function docToResource(snap: DocumentSnapshot): Resource {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    title: d.title,
    description: d.description ?? '',
    department: d.department,
    semester: d.semester,
    subject: d.subject,
    subjectCode: d.subjectCode ?? null,
    academicYear: d.academicYear ?? null,
    resourceType: d.resourceType,
    unit: d.unit ?? null,
    keywords: d.keywords ?? [],
    driveFileId: d.driveFileId,
    mimeType: d.mimeType,
    fileName: d.fileName ?? '',
    fileSizeBytes: d.fileSizeBytes ?? null,
    downloadAllowed: d.downloadAllowed !== false,
    verificationStatus: d.verificationStatus,
    publicationStatus: d.publicationStatus,
    source: d.source,
    uploadedBy: d.uploadedBy,
    uploaderName: d.uploaderName ?? '',
    contributorNote: d.contributorNote ?? null,
    approval: d.approval ?? null,
    rejectionReason: d.rejectionReason ?? null,
    searchText: d.searchText ?? '',
    createdAt: toIso(d.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(d.updatedAt) ?? new Date(0).toISOString(),
    publishedAt: toIso(d.publishedAt),
  };
}

export function isPubliclyVisible(r: Pick<Resource, 'publicationStatus' | 'verificationStatus'>): boolean {
  return r.publicationStatus === 'published' && r.verificationStatus === 'approved';
}

export function toPublicResource(r: Resource): PublicResource {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    department: r.department,
    semester: r.semester,
    subject: r.subject,
    subjectCode: r.subjectCode,
    academicYear: r.academicYear,
    resourceType: r.resourceType,
    unit: r.unit,
    keywords: r.keywords,
    mimeType: r.mimeType,
    fileSizeBytes: r.fileSizeBytes,
    uploaderName: r.uploaderName,
    verificationStatus: r.verificationStatus,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    links: buildDriveLinks(r.driveFileId, r.mimeType, r.downloadAllowed),
  };
}

// ---------------------------------------------------------------------------
// Public catalogue (cached in memory; invalidated on every write in this process)
// ---------------------------------------------------------------------------

const CATALOGUE_TTL_MS = 60 * 1000;
let catalogue: { at: number; items: Resource[] } | null = null;

export function invalidateCatalogue() {
  catalogue = null;
}

async function publishedResources(): Promise<Resource[]> {
  if (catalogue && Date.now() - catalogue.at < CATALOGUE_TTL_MS) return catalogue.items;
  const snap = await adminDb().collection(RESOURCES).where('publicationStatus', '==', 'published').get();
  // Belt and braces: never expose anything that is not also approved.
  const items = snap.docs.map(docToResource).filter(isPubliclyVisible);
  catalogue = { at: Date.now(), items };
  return items;
}

export async function searchPublished(query: ResourceSearchQuery): Promise<Paginated<PublicResource>> {
  const result = searchResources(await publishedResources(), query);
  return { ...result, items: result.items.map(toPublicResource) };
}

export async function publishedFacets(): Promise<ResourceFacets> {
  return computeFacets(await publishedResources());
}

export async function getPublishedResource(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw notFound('Resource not found');
  const snap = await adminDb().collection(RESOURCES).doc(id).get();
  if (!snap.exists) throw notFound('Resource not found');
  const resource = docToResource(snap);
  if (!isPubliclyVisible(resource)) throw notFound('Resource not found');
  const lookup = await checkAvailability(resource.driveFileId);
  const availability = lookup.ok ? (lookup.supported ? 'available' : 'unsupported') : lookup.availability;
  const message = lookup.ok
    ? lookup.supported
      ? null
      : 'This file type cannot be previewed.'
    : lookup.message;
  // Respect a download restriction the owner added after registration.
  const downloadAllowed = lookup.ok ? lookup.file.downloadAllowed && resource.downloadAllowed : resource.downloadAllowed;
  const pub = toPublicResource({ ...resource, downloadAllowed });
  if (availability !== 'available' && availability !== 'not_configured') {
    pub.links.download = null;
  }
  return { resource: pub, availability, availabilityMessage: message };
}

// ---------------------------------------------------------------------------
// Registration (admin, import and contributor submissions share this path)
// ---------------------------------------------------------------------------

export interface ResourceMetadataInput {
  title: string;
  description: string;
  department: string;
  semester: number;
  subject: string;
  subjectCode: string | null;
  academicYear: string | null;
  resourceType: ResourceType;
  unit: string | null;
  keywords: string[];
}

/** Resolves a Drive reference to verified file metadata, or throws a user-facing error. */
export async function lookupDriveFile(driveRef: string): Promise<DriveFileMetadata> {
  const fileId = extractDriveFileId(driveRef);
  if (!fileId) throw badRequest('Enter a Google Drive file link or file ID', 'invalid_drive_reference');
  const result = await getDriveClient().getFile(fileId);
  if (!result.ok) {
    const status = result.availability === 'not_configured' ? 503 : result.availability === 'error' ? 502 : 422;
    throw new ApiError(status, `drive_${result.availability}`, result.message);
  }
  if (!result.supported) {
    throw new ApiError(
      422,
      'unsupported_file_type',
      `Files of type "${result.file.mimeType}" are not supported. Upload a PDF, Google Doc/Slides, Word or PowerPoint file.`
    );
  }
  return result.file;
}

function buildResourceDoc(
  meta: ResourceMetadataInput,
  file: DriveFileMetadata,
  actor: Pick<AuthContext, 'uid' | 'displayName'>,
  source: ResourceSource,
  contributorNote: string | null
) {
  const base = {
    ...meta,
    driveFileId: file.id,
    mimeType: file.mimeType,
    fileName: file.name,
    fileSizeBytes: file.sizeBytes,
    downloadAllowed: file.downloadAllowed,
  };
  return {
    ...base,
    searchText: buildSearchText(base),
    verificationStatus: 'pending' as VerificationStatus,
    publicationStatus: 'draft' as PublicationStatus,
    source,
    uploadedBy: actor.uid,
    uploaderName: actor.displayName,
    contributorNote,
    approval: null,
    rejectionReason: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: null,
  };
}

/**
 * Creates the resource and claims its Drive file ID in `driveFileIndex` atomically,
 * so the same file can never be registered twice.
 */
export async function createResourceRecord(
  meta: ResourceMetadataInput,
  file: DriveFileMetadata,
  actor: Pick<AuthContext, 'uid' | 'displayName'>,
  source: ResourceSource,
  contributorNote: string | null = null
): Promise<Resource> {
  const db = adminDb();
  const ref = db.collection(RESOURCES).doc();
  const indexRef = db.collection(DRIVE_INDEX).doc(file.id);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(indexRef);
    if (existing.exists) {
      throw conflict('This Drive file is already registered in PairPrep.', 'duplicate_resource');
    }
    tx.create(indexRef, { resourceId: ref.id, createdAt: FieldValue.serverTimestamp() });
    tx.create(ref, buildResourceDoc(meta, file, actor, source, contributorNote));
  });
  return docToResource(await ref.get());
}

export async function registerResource(
  actor: AuthContext,
  input: ResourceMetadataInput & { driveRef: string },
  source: ResourceSource = 'admin',
  contributorNote: string | null = null
): Promise<Resource> {
  if (source === 'contribution') {
    const open = await adminDb()
      .collection(RESOURCES)
      .where('uploadedBy', '==', actor.uid)
      .where('verificationStatus', 'in', ['pending', 'under_review'])
      .count()
      .get();
    if (open.data().count >= MAX_OPEN_SUBMISSIONS_PER_USER) {
      throw new ApiError(
        429,
        'too_many_pending',
        `You already have ${MAX_OPEN_SUBMISSIONS_PER_USER} submissions waiting for review. Please wait for them to be reviewed.`
      );
    }
  }
  const file = await lookupDriveFile(input.driveRef);
  const { driveRef: _driveRef, ...meta } = input;
  void _driveRef;
  return createResourceRecord(meta, file, actor, source, contributorNote);
}

// ---------------------------------------------------------------------------
// Admin management
// ---------------------------------------------------------------------------

async function getResourceOrThrow(id: string, tx?: Transaction) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw notFound('Resource not found');
  const ref = adminDb().collection(RESOURCES).doc(id);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) throw notFound('Resource not found');
  return { ref, resource: docToResource(snap) };
}

export async function getResourceForAdmin(id: string): Promise<Resource> {
  return (await getResourceOrThrow(id)).resource;
}

export async function listResourcesForAdmin(filters: {
  q?: string;
  verificationStatus?: VerificationStatus;
  publicationStatus?: PublicationStatus;
  department?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<Resource>> {
  let query: FirebaseFirestore.Query = adminDb().collection(RESOURCES);
  if (filters.verificationStatus) query = query.where('verificationStatus', '==', filters.verificationStatus);
  if (filters.publicationStatus) query = query.where('publicationStatus', '==', filters.publicationStatus);
  const snap = await query.limit(2000).get();
  return searchResources(snap.docs.map(docToResource), {
    q: filters.q,
    department: filters.department,
    sort: 'newest',
    page: filters.page,
    pageSize: filters.pageSize ?? 20,
  });
}

export async function adminStats(): Promise<AdminStats> {
  const col = adminDb().collection(RESOURCES);
  const count = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  // Equality-only filters, so no composite indexes are needed for these counts.
  const [total, published, pending, underReview, approved, approvedPublished, rejected] = await Promise.all([
    count(col),
    count(col.where('publicationStatus', '==', 'published')),
    count(col.where('verificationStatus', '==', 'pending')),
    count(col.where('verificationStatus', '==', 'under_review')),
    count(col.where('verificationStatus', '==', 'approved')),
    count(col.where('verificationStatus', '==', 'approved').where('publicationStatus', '==', 'published')),
    count(col.where('verificationStatus', '==', 'rejected')),
  ]);
  return {
    total,
    published,
    pending,
    underReview,
    approvedAwaitingPublication: approved - approvedPublished,
    rejected,
  };
}

async function cancelOpenAssignments(tx: Transaction, resourceId: string) {
  const open = await tx.get(
    adminDb().collection(ASSIGNMENTS).where('resourceId', '==', resourceId).where('status', '==', 'assigned')
  );
  for (const doc of open.docs) {
    tx.update(doc.ref, { status: 'cancelled', completedAt: FieldValue.serverTimestamp() });
  }
}

export async function updateResource(_admin: AuthContext, id: string, patch: UpdateResourceInput): Promise<Resource> {
  const db = adminDb();
  const newFile = patch.driveRef ? await lookupDriveFile(patch.driveRef) : null;

  await db.runTransaction(async (tx) => {
    const { ref, resource } = await getResourceOrThrow(id, tx);
    const { driveRef: _driveRef, ...fields } = patch;
    void _driveRef;
    const merged = { ...resource, ...fields };
    const update: Record<string, unknown> = { ...fields, updatedAt: FieldValue.serverTimestamp() };

    if (newFile && newFile.id !== resource.driveFileId) {
      const newIndex = db.collection(DRIVE_INDEX).doc(newFile.id);
      const taken = await tx.get(newIndex);
      if (taken.exists) throw conflict('That Drive file is already registered.', 'duplicate_resource');
      await cancelOpenAssignments(tx, id);
      tx.delete(db.collection(DRIVE_INDEX).doc(resource.driveFileId));
      tx.create(newIndex, { resourceId: id, createdAt: FieldValue.serverTimestamp() });
      Object.assign(update, {
        driveFileId: newFile.id,
        mimeType: newFile.mimeType,
        fileName: newFile.name,
        fileSizeBytes: newFile.sizeBytes,
        downloadAllowed: newFile.downloadAllowed,
        // A different document must be verified again from scratch.
        verificationStatus: 'pending',
        publicationStatus: 'draft',
        approval: null,
        publishedAt: null,
      });
      merged.fileName = newFile.name;
    }
    update.searchText = buildSearchText(merged);
    tx.update(ref, update);
  });
  invalidateCatalogue();
  return getResourceForAdmin(id);
}

export async function performResourceAction(
  admin: AuthContext,
  id: string,
  action: 'publish' | 'unpublish' | 'reject',
  reason?: string
): Promise<Resource> {
  const db = adminDb();

  if (action === 'publish') {
    // Re-check the file before it goes live so a deleted/unshared file is never published.
    const { resource } = await getResourceOrThrow(id);
    const drive = getDriveClient();
    if (drive.isConfigured()) {
      const lookup = await drive.getFile(resource.driveFileId);
      if (!lookup.ok) throw new ApiError(422, `drive_${lookup.availability}`, `Cannot publish: ${lookup.message}`);
    }
  }

  await db.runTransaction(async (tx) => {
    const { ref, resource } = await getResourceOrThrow(id, tx);
    if (action === 'publish') {
      if (resource.publicationStatus === 'published') throw conflict('This resource is already published.');
      if (resource.verificationStatus !== 'approved' || !resource.approval) {
        throw forbidden('A reviewer must approve this resource before it can be published.');
      }
      if (resource.approval.reviewerUid === resource.uploadedBy) {
        throw forbidden('The approval must come from someone other than the uploader.');
      }
      tx.update(ref, {
        publicationStatus: 'published',
        publishedAt: FieldValue.serverTimestamp(),
        publishedBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (action === 'unpublish') {
      if (resource.publicationStatus !== 'published') throw conflict('This resource is not published.');
      tx.update(ref, {
        publicationStatus: 'unpublished',
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      if (resource.publicationStatus === 'published') {
        throw conflict('Unpublish this resource before rejecting it.');
      }
      if (!reason?.trim()) throw badRequest('Give a reason for rejecting this resource.');
      await cancelOpenAssignments(tx, id);
      tx.update(ref, {
        verificationStatus: 'rejected',
        rejectionReason: reason.trim(),
        approval: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
  invalidateCatalogue();
  return getResourceForAdmin(id);
}

export async function deleteResource(_admin: AuthContext, id: string): Promise<void> {
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const { ref, resource } = await getResourceOrThrow(id, tx);
    const assignments = await tx.get(db.collection(ASSIGNMENTS).where('resourceId', '==', id));
    for (const a of assignments.docs) tx.delete(a.ref);
    tx.delete(db.collection(DRIVE_INDEX).doc(resource.driveFileId));
    tx.delete(ref);
  });
  invalidateCatalogue();
}

export async function listSubmissionsBy(uid: string): Promise<Resource[]> {
  const snap = await adminDb()
    .collection(RESOURCES)
    .where('uploadedBy', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return snap.docs.map(docToResource);
}

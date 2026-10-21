import type { FileKind } from './registry';

export type SniffResult = { kind: FileKind } | { kind: null; reason: string };

const MAX_ZIP_ENTRIES = 5000;
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // zip-bomb guard (declared sizes)

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((b, i) => bytes[offset + i] === b);
}

function latin1(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Lists entry names of a ZIP container from its central directory. Returns null if the
 * structure is not a well-formed, non-ZIP64 archive. Never inflates anything.
 */
export function listZipEntries(bytes: Uint8Array): { names: string[]; uncompressed: number } | { error: string } {
  if (bytes.length < 22) return { error: 'File is too small to be a valid archive' };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // End Of Central Directory record: scan backwards (it may be followed by a comment).
  let eocd = -1;
  const lowest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= lowest; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { error: 'Archive structure is damaged' };

  const entryCount = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    return { error: 'ZIP64 archives are not supported' };
  }
  if (entryCount > MAX_ZIP_ENTRIES) return { error: 'Archive contains too many entries' };
  if (cdOffset + cdSize > bytes.length) return { error: 'Archive structure is damaged' };

  const names: string[] = [];
  let uncompressed = 0;
  let pos = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) {
      return { error: 'Archive structure is damaged' };
    }
    const flags = view.getUint16(pos + 8, true);
    uncompressed += view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    if (flags & 0x1) return { error: 'Encrypted archives are not accepted' };
    if (pos + 46 + nameLen > bytes.length) return { error: 'Archive structure is damaged' };
    names.push(latin1(bytes, pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;
  }
  if (uncompressed > MAX_UNCOMPRESSED_BYTES) return { error: 'Archive expands to an unreasonable size' };
  return { names, uncompressed };
}

const FORBIDDEN_ENTRY = /(^|\/)(vbaProject\.bin|activeX\d*\.(xml|bin))$|\.(exe|dll|bat|cmd|com|scr|msi|jar|js|vbs|ps1|sh)$/i;

function sniffOfficeOpenXml(bytes: Uint8Array): SniffResult {
  const zip = listZipEntries(bytes);
  if ('error' in zip) return { kind: null, reason: zip.error };

  for (const name of zip.names) {
    if (name.startsWith('/') || name.includes('..') || name.includes('\\')) {
      return { kind: null, reason: 'Archive contains unsafe paths' };
    }
    if (FORBIDDEN_ENTRY.test(name)) {
      return { kind: null, reason: 'Macro-enabled or executable content is not accepted' };
    }
  }
  const names = new Set(zip.names);
  if (!names.has('[Content_Types].xml')) return { kind: null, reason: 'Not an Office document' };
  if (names.has('word/document.xml')) return { kind: 'docx' };
  if (names.has('ppt/presentation.xml')) return { kind: 'pptx' };
  return { kind: null, reason: 'Archive is not a Word or PowerPoint document' };
}

/**
 * Identifies a file from its CONTENT (magic bytes and container structure). File names and
 * browser-declared MIME types are never consulted. Pass the whole file for ZIP-based formats.
 */
export function sniffFile(bytes: Uint8Array): SniffResult {
  if (bytes.length === 0) return { kind: null, reason: 'File is empty' };

  // PDF: "%PDF-" within the first KiB (the spec tolerates leading junk).
  if (latin1(bytes, 0, Math.min(bytes.length, 1024)).includes('%PDF-')) return { kind: 'pdf' };

  // PNG: 8-byte signature followed by an IHDR chunk.
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return startsWith(bytes, [0x49, 0x48, 0x44, 0x52], 12)
      ? { kind: 'png' }
      : { kind: null, reason: 'PNG image is malformed' };
  }

  // JPEG: SOI marker followed by another marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: 'jpg' };

  // ZIP container (docx / pptx).
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return sniffOfficeOpenXml(bytes);
  }

  return { kind: null, reason: 'Unrecognised or unsupported file type' };
}

import { describe, expect, it } from 'vitest';
import { sniffFile } from '@/lib/files/sniff';
import {
  FILE_KIND_INFO, isValidUploadPath, kindFromFileName, kindFromMime, sanitizeFileName,
} from '@/lib/files/registry';
import { describeExternalHost, parseSafeHttpsUrl } from '@/lib/files/urls';
import { buildZip, docxFiles, pptxFiles } from './zip-builder';

const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => new TextEncoder().encode(s);
const pad = (head: Uint8Array, total = 256) => {
  const out = new Uint8Array(total);
  out.set(head);
  return out;
};

describe('sniffFile (content-based detection)', () => {
  it('identifies PDF, PNG and JPEG by signature', () => {
    expect(sniffFile(text('%PDF-1.7\n1 0 obj\n'))).toEqual({ kind: 'pdf' });
    expect(sniffFile(pad(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52)))).toEqual({ kind: 'png' });
    expect(sniffFile(pad(bytes(0xff, 0xd8, 0xff, 0xe0)))).toEqual({ kind: 'jpg' });
  });

  it('tolerates PDF header junk within the first KiB only', () => {
    expect(sniffFile(text(`${' '.repeat(500)}%PDF-1.4`))).toEqual({ kind: 'pdf' });
    expect(sniffFile(text(`${' '.repeat(2000)}%PDF-1.4`)).kind).toBeNull();
  });

  it('rejects scripts, HTML, SVG, executables and plain text however they are named', () => {
    for (const body of [
      '<!doctype html><script>alert(1)</script>',
      '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>',
      '#!/bin/sh\nrm -rf /',
      'MZ\x90\x00\x03', // Windows PE
      '\x7fELF\x02\x01',
      'just some notes',
      '',
    ]) {
      expect(sniffFile(text(body)).kind, body.slice(0, 20)).toBeNull();
    }
  });

  it('rejects a truncated PNG signature', () => {
    const r = sniffFile(pad(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0)));
    expect(r).toMatchObject({ kind: null });
  });

  it('identifies real docx and pptx containers', () => {
    expect(sniffFile(buildZip(docxFiles))).toEqual({ kind: 'docx' });
    expect(sniffFile(buildZip(pptxFiles))).toEqual({ kind: 'pptx' });
    expect(sniffFile(buildZip(docxFiles, { comment: 'trailing comment' }))).toEqual({ kind: 'docx' });
  });

  it('refuses a plain ZIP (or a renamed one) posing as an Office document', () => {
    expect(sniffFile(buildZip({ 'readme.txt': 'hello', 'payload.bin': 'xx' }))).toMatchObject({ kind: null });
    expect(sniffFile(buildZip({ '[Content_Types].xml': '<Types/>', 'other/file.xml': '<a/>' }))).toMatchObject({ kind: null });
  });

  it('refuses macro-enabled, executable, encrypted and path-traversing archives', () => {
    expect(sniffFile(buildZip({ ...docxFiles, 'word/vbaProject.bin': 'macro' }))).toMatchObject({ kind: null, reason: expect.stringMatching(/macro|executable/i) });
    expect(sniffFile(buildZip({ ...docxFiles, 'payload.exe': 'MZ' }))).toMatchObject({ kind: null });
    expect(sniffFile(buildZip({ ...docxFiles, 'word/embeddings/run.js': 'x' }))).toMatchObject({ kind: null });
    expect(sniffFile(buildZip(docxFiles, { encrypted: true }))).toMatchObject({ kind: null, reason: expect.stringMatching(/encrypted/i) });
    expect(sniffFile(buildZip({ ...docxFiles, '../../etc/passwd': 'x' }))).toMatchObject({ kind: null, reason: expect.stringMatching(/unsafe/i) });
    expect(sniffFile(buildZip({ ...docxFiles, '/abs/path': 'x' }))).toMatchObject({ kind: null });
  });

  it('refuses damaged archives instead of throwing', () => {
    const good = buildZip(docxFiles);
    expect(sniffFile(good.slice(0, 40))).toMatchObject({ kind: null });
    expect(sniffFile(bytes(0x50, 0x4b, 0x03, 0x04, 1, 2, 3))).toMatchObject({ kind: null });
    const corrupted = good.slice();
    corrupted.fill(0, corrupted.length - 22, corrupted.length - 10); // wreck the EOCD record
    expect(sniffFile(corrupted)).toMatchObject({ kind: null });
  });

  it('declared sizes cannot hide a zip bomb', () => {
    const zip = buildZip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': '<w/>' });
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    // central directory: patch the first entry's uncompressed size to 4 GiB - 1
    const cdOffset = view.getUint32(zip.length - 22 + 16, true);
    view.setUint32(cdOffset + 24, 0xfffffff0, true);
    expect(sniffFile(zip)).toMatchObject({ kind: null, reason: expect.stringMatching(/unreasonable/i) });
  });
});

describe('file registry helpers', () => {
  it('maps names and MIME types, and canonicalises display names for the DETECTED type', () => {
    expect(kindFromFileName('Notes.PDF')).toBe('pdf');
    expect(kindFromFileName('photo.jpeg')).toBe('jpg');
    expect(kindFromFileName('virus.exe')).toBeNull();
    expect(kindFromMime(FILE_KIND_INFO.docx.mime)).toBe('docx');
    expect(kindFromMime('text/html')).toBeNull();

    expect(sanitizeFileName('unit 3 notes.pdf', 'pdf')).toBe('unit 3 notes.pdf');
    expect(sanitizeFileName('../../etc/passwd.html', 'pdf')).toBe('passwd.pdf');
    for (const hostile of [
      'C:\\Users\\me\\<script>alert(1)</script>.png', '"><img src=x onerror=alert(1)>.pdf', 'a\u0000b\u202eexe.pdf', 'name;rm -rf.pdf', '$(whoami).pdf',
    ]) {
      const safe = sanitizeFileName(hostile, 'pdf');
      expect(safe, hostile).toMatch(/^[\p{L}\p{N} ._()-]+\.pdf$/u);
      expect(safe).not.toMatch(/[<>"'`;$\\/\u0000-\u001f\u202e]/u);
    }
    expect(sanitizeFileName('....', 'docx')).toBe('file.docx');
    expect(sanitizeFileName('x'.repeat(500) + '.pdf', 'pdf').length).toBeLessThanOrEqual(104);
    expect(sanitizeFileName('résumé notes.pdf', 'pdf')).toBe('résumé notes.pdf');
  });

  it('accepts only the exact upload path shapes the storage policies allow', () => {
    const uid = '11111111-2222-3333-4444-555555555555';
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(isValidUploadPath('contributions-private', uid, `${uid}/${id}.pdf`)).toBe(true);
    expect(isValidUploadPath('resources-published', uid, `uploads/${uid}/${id}.docx`)).toBe(true);
    expect(isValidUploadPath('contributions-private', uid, `${id}/${id}.pdf`)).toBe(false);
    expect(isValidUploadPath('contributions-private', uid, `${uid}/${id}.exe`)).toBe(false);
    expect(isValidUploadPath('contributions-private', uid, `${uid}/../${uid}/${id}.pdf`)).toBe(false);
    expect(isValidUploadPath('contributions-private', uid, `${uid}/x/${id}.pdf`)).toBe(false);
    expect(isValidUploadPath('resources-published', uid, `${uid}/${id}.pdf`)).toBe(false);
    expect(isValidUploadPath('other-bucket', uid, `${uid}/${id}.pdf`)).toBe(false);
    expect(isValidUploadPath('contributions-private', 'not-a-uuid', `not-a-uuid/${id}.pdf`)).toBe(false);
  });
});

describe('parseSafeHttpsUrl', () => {
  it('accepts normal public https links', () => {
    expect(parseSafeHttpsUrl('https://drive.google.com/file/d/1AbC/view?usp=sharing')).toBe('https://drive.google.com/file/d/1AbC/view?usp=sharing');
    expect(parseSafeHttpsUrl('  https://github.com/org/repo  ')).toBe('https://github.com/org/repo');
    expect(parseSafeHttpsUrl('https://notes.college.ac.in/a.pdf')).toBeTruthy();
  });

  it('rejects every unsafe or deceptive form', () => {
    for (const url of [
      'http://example.org/a', 'ftp://example.org/a', 'javascript:alert(1)', 'data:text/html,<b>', 'file:///etc/passwd',
      'https://localhost/a', 'https://intranet/a', 'https://127.0.0.1/a', 'https://10.0.0.5/a', 'https://[::1]/a',
      'https://169.254.169.254/latest/meta-data', 'https://user:pass@example.org/a', 'https://exa mple.org', 'https://example.org/<script>',
      'https://printer.local/a', 'https://svc.internal/a', '//example.org/a', 'example.org/a', '', 'https://' + 'a'.repeat(2100) + '.com',
      'https://example.org/"onmouseover="x',
    ]) {
      expect(parseSafeHttpsUrl(url), url.slice(0, 50)).toBeNull();
    }
    expect(parseSafeHttpsUrl(null)).toBeNull();
    expect(parseSafeHttpsUrl(undefined)).toBeNull();
  });

  it('labels common hosts and warns about permission-gated ones', () => {
    expect(describeExternalHost('https://drive.google.com/file/d/1/view')).toMatchObject({ label: 'Google Drive', mayNeedAccess: true });
    expect(describeExternalHost('https://github.com/a/b')).toMatchObject({ label: 'GitHub', mayNeedAccess: false });
    expect(describeExternalHost('https://www.example.org/x')).toMatchObject({ host: 'example.org' });
  });
});

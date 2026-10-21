import { describe, expect, it } from 'vitest';
import {
  buildDriveLinks,
  extractDriveFileId,
  extractDriveFolderId,
  parseDriveReference,
} from '@/lib/drive/fileId';

const ID = '1R8IjP3eDpeYkhrmeFcGzxWyJ368vohJn';

describe('parseDriveReference', () => {
  it.each([
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, 'file'],
    [`https://drive.google.com/file/d/${ID}`, 'file'],
    [`https://docs.google.com/document/d/${ID}/edit`, 'file'],
    [`https://docs.google.com/presentation/d/${ID}/edit#slide=id.p`, 'file'],
    [`https://drive.google.com/open?id=${ID}`, 'unknown'],
    [`https://drive.google.com/uc?export=download&id=${ID}`, 'unknown'],
    [`https://drive.google.com/drive/folders/${ID}?usp=sharing`, 'folder'],
    [`https://drive.google.com/drive/u/1/folders/${ID}`, 'folder'],
    [ID, 'unknown'],
  ])('accepts %s', (input, kind) => {
    expect(parseDriveReference(input)).toEqual({ id: ID, kind });
  });

  it.each([
    '',
    'not a link',
    `http://drive.google.com/file/d/${ID}/view`, // not https
    `https://evil.example.com/file/d/${ID}/view`,
    `https://drive.google.com.evil.com/file/d/${ID}/view`,
    `https://user:pass@drive.google.com/file/d/${ID}/view`,
    `https://drive.google.com:8443/file/d/${ID}/view`,
    'https://drive.google.com/file/d/short/view',
    `https://drive.google.com/file/d/${ID}%2F..%2F/view`,
    'javascript:alert(1)',
    `https://drive.google.com/file/d/<script>/view`,
  ])('rejects %s', (input) => {
    expect(parseDriveReference(input)).toBeNull();
  });

  it('separates files from folders', () => {
    expect(extractDriveFileId(`https://drive.google.com/drive/folders/${ID}`)).toBeNull();
    expect(extractDriveFolderId(`https://drive.google.com/file/d/${ID}/view`)).toBeNull();
    expect(extractDriveFolderId(`https://drive.google.com/drive/folders/${ID}`)).toBe(ID);
  });
});

describe('buildDriveLinks', () => {
  it('builds viewer links and omits download when not allowed', () => {
    const links = buildDriveLinks(ID, 'application/pdf', false);
    expect(links.preview).toBe(`https://drive.google.com/file/d/${ID}/preview`);
    expect(links.download).toBeNull();
  });
  it('uses PDF export for Google-native documents', () => {
    expect(buildDriveLinks(ID, 'application/vnd.google-apps.document', true).download).toBe(
      `https://docs.google.com/document/d/${ID}/export?format=pdf`
    );
  });
  it('refuses to build a URL from an invalid id', () => {
    expect(() => buildDriveLinks('../../x', 'application/pdf', true)).toThrow();
  });
});

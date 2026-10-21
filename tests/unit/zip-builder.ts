// Minimal "stored" (uncompressed) ZIP writer so tests can craft real archives.

function crc32(data: Uint8Array): number {
  let c: number;
  let crc = 0xffffffff;
  for (let n = 0; n < data.length; n++) {
    c = (crc ^ data[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZip(entries: Record<string, string>, opts: { encrypted?: boolean; comment?: string } = {}): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const flags = opts.encrypted ? 1 : 0;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, flags, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, flags, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const comment = enc.encode(opts.comment ?? '');
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, Object.keys(entries).length, true);
  eocd.setUint16(10, Object.keys(entries).length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, offset, true);
  eocd.setUint16(20, comment.length, true);

  const parts = [...chunks, ...central, new Uint8Array(eocd.buffer), comment];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

export const docxFiles = {
  '[Content_Types].xml': '<Types/>',
  '_rels/.rels': '<Relationships/>',
  'word/document.xml': '<w:document/>',
};
export const pptxFiles = {
  '[Content_Types].xml': '<Types/>',
  'ppt/presentation.xml': '<p:presentation/>',
};

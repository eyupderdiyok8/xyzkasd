// Generates simple placeholder PNG icons for the PWA
// Creates solid blue (#1e40af) squares with "WPS" text when canvas is available
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { deflateSync } = require('node:zlib');

/**
 * PNG CRC32
 */
function createCrc32() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return function (buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
}

const crc32 = createCrc32();

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

/**
 * Creates a solid-color PNG of given dimensions.
 */
function createSolidPng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT: raw rows (filter byte 0 + RGB pixels)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 3);
    rawData[rowOff] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const pxOff = rowOff + 1 + x * 3;
      rawData[pxOff] = r;
      rawData[pxOff + 1] = g;
      rawData[pxOff + 2] = b;
    }
  }
  const compressed = deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Check if node-canvas is available
let hasCanvas = false;
try {
  require.resolve('canvas');
  hasCanvas = true;
} catch {
  // not installed
}

const iconsDir = join(__dirname, '..', 'public', 'icons');

if (hasCanvas) {
  const { createCanvas } = require('canvas');

  const canvas192 = createCanvas(192, 192);
  const ctx192 = canvas192.getContext('2d');
  ctx192.fillStyle = '#1e40af';
  ctx192.fillRect(0, 0, 192, 192);
  ctx192.fillStyle = '#ffffff';
  ctx192.font = 'bold 64px sans-serif';
  ctx192.textAlign = 'center';
  ctx192.textBaseline = 'middle';
  ctx192.fillText('💧', 96, 72);
  ctx192.font = 'bold 36px sans-serif';
  ctx192.fillText('WPS', 96, 132);
  writeFileSync(join(iconsDir, 'icon-192.png'), canvas192.toBuffer('image/png'));

  const canvas512 = createCanvas(512, 512);
  const ctx512 = canvas512.getContext('2d');
  ctx512.fillStyle = '#1e40af';
  ctx512.fillRect(0, 0, 512, 512);
  ctx512.fillStyle = '#ffffff';
  ctx512.font = 'bold 160px sans-serif';
  ctx512.textAlign = 'center';
  ctx512.textBaseline = 'middle';
  ctx512.fillText('💧', 256, 190);
  ctx512.font = 'bold 90px sans-serif';
  ctx512.fillText('WPS', 256, 350);
  writeFileSync(join(iconsDir, 'icon-512.png'), canvas512.toBuffer('image/png'));

  console.log('Icons generated with canvas (water drop + WPS text).');
} else {
  // Fallback: solid blue squares with chevron pattern
  // 192x192
  const blue192 = createSolidPng(192, 192, 30, 64, 175);
  writeFileSync(join(iconsDir, 'icon-192.png'), blue192);

  // 512x512
  const blue512 = createSolidPng(512, 512, 30, 64, 175);
  writeFileSync(join(iconsDir, 'icon-512.png'), blue512);

  console.log('Icons generated as solid blue squares (install "canvas" npm package for text-based icons).');
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { imageSize, fitInside, parseImageDataUrl } from "../src/lib/image-size.ts";

// PNG 1x1 transparan (header asli) — lalu IHDR diubah ke 300x120.
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test("imageSize: PNG membaca IHDR", () => {
  const buf = Uint8Array.from(Buffer.from(PNG_1x1, "base64"));
  assert.deepEqual(imageSize(buf), { width: 1, height: 1 });
  const dv = new DataView(buf.buffer);
  dv.setUint32(16, 300);
  dv.setUint32(20, 120);
  assert.deepEqual(imageSize(buf), { width: 300, height: 120 });
});

test("imageSize: JPEG melewati segmen APP lalu baca SOF0", () => {
  const jpg = Uint8Array.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 (len 4)
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // SOF0 600x800
  ]);
  assert.deepEqual(imageSize(jpg), { width: 800, height: 600 });
});

test("imageSize: format lain / rusak → null", () => {
  assert.equal(imageSize(Uint8Array.from([1, 2, 3])), null);
  assert.equal(imageSize(new TextEncoder().encode("RIFF....WEBPVP8 ")), null);
});

test("fitInside: rasio tetap, muat di kotak", () => {
  assert.deepEqual(fitInside({ width: 1536, height: 1024 }, 560, 480), { width: 560, height: 373 });
  assert.deepEqual(fitInside({ width: 100, height: 400 }, 560, 480), { width: 120, height: 480 });
  // Logo kecil: pembesaran dibatasi agar tak buram.
  assert.deepEqual(fitInside({ width: 120, height: 120 }, 560, 500, 2), { width: 240, height: 240 });
  assert.deepEqual(fitInside({ width: 1536, height: 1024 }, 560, 500, 2), { width: 560, height: 373 });
});

test("parseImageDataUrl: hanya png/jpeg base64", () => {
  assert.equal(parseImageDataUrl(`data:image/png;base64,${PNG_1x1}`)?.mime, "image/png");
  assert.equal(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(parseImageDataUrl("https://x/logo.png"), null);
});

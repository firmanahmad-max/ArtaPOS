/**
 * Ukuran intrinsik gambar dari byte header PNG/JPEG — murni, tanpa dependensi.
 * Dipakai untuk gambar OG (satori butuh width/height eksplisit) dari logo toko
 * yang tersimpan sebagai data URL.
 */

export interface ImageSize {
  width: number;
  height: number;
}

export function imageSize(buf: Uint8Array): ImageSize | null {
  // PNG: signature 8 byte, lalu chunk IHDR (width/height big-endian di offset 16/20).
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const width = dv.getUint32(16);
    const height = dv.getUint32(20);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  // JPEG: telusuri segmen sampai marker SOF (C0–CF kecuali C4/C8/CC).
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1; // byte pengisi
        continue;
      }
      const len = (buf[i + 2] << 8) | buf[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = (buf[i + 5] << 8) | buf[i + 6];
        const width = (buf[i + 7] << 8) | buf[i + 8];
        return width > 0 && height > 0 ? { width, height } : null;
      }
      if (len < 2) return null;
      i += 2 + len;
    }
  }
  return null;
}

/**
 * Skala agar muat di kotak (maxW×maxH) dengan rasio tetap. Membesar dibatasi
 * `maxScale` (logo kecil yang diperbesar berlebihan jadi buram).
 */
export function fitInside(size: ImageSize, maxW: number, maxH: number, maxScale = Infinity): ImageSize {
  const s = Math.min(maxW / size.width, maxH / size.height, maxScale);
  return { width: Math.round(size.width * s), height: Math.round(size.height * s) };
}

/** Pecah data URL base64 raster (png/jpeg). Selain itu → null. */
export function parseImageDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], bytes: Uint8Array.from(Buffer.from(m[2], "base64")) };
}

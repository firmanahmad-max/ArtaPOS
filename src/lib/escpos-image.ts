/**
 * Konversi gambar (data URL) → raster monokrom 1-bit untuk perintah ESC/POS GS v 0.
 * Berjalan di browser (pakai canvas). Lebar dibatasi agar pas di kertas thermal.
 */
export interface EscposRaster {
  width: number; // lebar dalam piksel (kelipatan tak wajib)
  height: number; // tinggi dalam piksel
  widthBytes: number; // ceil(width/8)
  data: Uint8Array; // baris demi baris, MSB = piksel paling kiri, bit 1 = hitam
}

export function imageToEscposRaster(dataUrl: string, maxWidth = 384): Promise<EscposRaster> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Gagal memuat logo"));
    img.onload = () => {
      // Skala ke lebar target (genapkan ke kelipatan 8 agar rapi).
      let width = Math.min(maxWidth, img.width);
      width = Math.max(8, Math.floor(width / 8) * 8);
      const height = Math.max(1, Math.round((img.height / img.width) * width));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas tidak didukung"));
      // Latar putih agar area transparan jadi putih (tak tercetak).
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const { data: px } = ctx.getImageData(0, 0, width, height);
      const widthBytes = width / 8;
      const out = new Uint8Array(widthBytes * height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
          // Luminance; piksel gelap & cukup opaque → titik hitam.
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255) + 255 * (1 - a / 255);
          if (lum < 160) {
            out[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
          }
        }
      }
      resolve({ width, height, widthBytes, data: out });
    };
    img.src = dataUrl;
  });
}

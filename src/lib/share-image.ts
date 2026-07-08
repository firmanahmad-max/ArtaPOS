import { toBlob } from "html-to-image";

export type ShareMode = "shared" | "downloaded";

/**
 * Render sebuah elemen (struk/nota) menjadi gambar PNG lalu:
 * - Bagikan lewat Web Share API (mobile → WhatsApp dsb., gambar terlampir), atau
 * - Unduh gambar (fallback desktop yang tak dukung berbagi file).
 */
export async function shareNodeAsImage(
  node: HTMLElement,
  opts: { fileName: string; title?: string; text?: string },
): Promise<{ mode: ShareMode }> {
  // pixelRatio 2 agar tajam; latar putih; cacheBust agar logo termuat.
  // width/height + margin:0 mencegah pergeseran/terpotong akibat `mx-auto`.
  const renderOpts = {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: { margin: "0", transform: "none" },
  } as const;
  // Panggilan pertama kadang belum memuat font/gambar (render kosong) → ulang sekali.
  await toBlob(node, renderOpts);
  const blob = await toBlob(node, renderOpts);
  if (!blob) throw new Error("Gagal membuat gambar struk.");

  const file = new File([blob], opts.fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };

  if (nav.canShare && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
    try {
      await nav.share({ files: [file], title: opts.title, text: opts.text });
      return { mode: "shared" };
    } catch (e) {
      // Pengguna membatalkan share sheet → anggap selesai, jangan unduh.
      const msg = e instanceof Error ? e.message : "";
      if (/abort|cancel|dismiss/i.test(msg)) return { mode: "shared" };
      // Error lain → lanjut ke fallback unduh.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { mode: "downloaded" };
}

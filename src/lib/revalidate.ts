import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Halaman lintas-modul yang meringkas angka penjualan/servis/stok
 * (Dashboard, Tanya Arta, Keuangan, Laporan).
 *
 * Halaman-halaman ini membaca data dari modul lain, jadi mutasi di POS /
 * servis / rakit PC WAJIB memanggil ini — kalau tidak, ringkasannya tetap
 * menampilkan angka lama (basi) walau data sumbernya sudah berubah.
 */
export function revalidateReports() {
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  revalidatePath("/finance");
  revalidatePath("/reports");
}

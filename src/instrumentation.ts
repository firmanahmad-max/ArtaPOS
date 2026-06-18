/**
 * Instrumentation Next.js — `register()` dijalankan SEKALI saat server start,
 * sebelum menangani request.
 *
 * Vercel mem-"reserve" nama env var `TZ` sehingga tak bisa diset lewat dashboard,
 * sementara servernya berjalan di UTC. Kita set zona waktu di sini agar tanggal/jam
 * yang dirender di sisi-server (mis. riwayat penjualan, shift) tampil dalam WIB,
 * bukan 7 jam lebih awal.
 *
 * Catatan: batas hari pada laporan keuangan/analitik/dashboard sudah dihitung
 * EKSPLISIT di WIB (lihat src/lib/timezone.ts) sehingga benar tanpa ini; setelan
 * ini melengkapi agar SEMUA tampilan tanggal konsisten. Untuk WITA/WIT ganti nilai.
 */
export async function register() {
  process.env.TZ ??= "Asia/Jakarta";
}

/**
 * Splash screen brand — memakai poster splash.png persis. Tampil sekali per
 * sesi saat aplikasi pertama dibuka, lalu memudar otomatis (~2,6 detik). Murni
 * CSS (globals.css: `.app-splash`); disembunyikan pra-paint via skrip
 * sessionStorage di layout agar tak berkedip pada muat ulang.
 */
export function SplashScreen() {
  return (
    <div className="app-splash" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/splash.png" alt="ArtaPOS — Dibangun untuk Toko Komputer Indonesia" className="app-splash-poster" />
    </div>
  );
}

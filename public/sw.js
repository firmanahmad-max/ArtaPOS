/* Service Worker — Toko Komputer (PWA).
 * Strategi:
 * - Aset statis immutable (/_next/static, ikon): cache-first.
 * - Navigasi halaman: network-first → fallback cache → fallback /offline.html.
 * - Hanya menangani GET same-origin. POST & /api/sync TIDAK di-cache (ditangani sync engine).
 */
const VERSION = "v2";
const CACHE = `toko-${VERSION}`;
const PRECACHE = ["/offline.html", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // lewati lintas-origin
  if (url.pathname.startsWith("/api/")) return; // API ditangani jaringan/sync

  // Aset statis: cache-first (hanya cache respons sukses & tak ter-redirect).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok && !res.redirected) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navigasi halaman: network-first, fallback /offline.html saat offline.
  // Sengaja TIDAK men-cache HTML halaman: berisi data ter-autentikasi (privasi)
  // & respons redirect tak boleh disajikan ulang untuk navigasi.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
  }
});

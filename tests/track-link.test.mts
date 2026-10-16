import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTrackUrl,
  trackExtrasLine,
  buildGalleryUrl,
  galleryRefKind,
  isLinkVisitKind,
  summarizeLinkVisits,
} from "../src/lib/track-link.ts";

test("buildTrackUrl: membawa no. tiket & slug toko, ter-encode", () => {
  assert.equal(buildTrackUrl("https://a.id", "SV-00001", "max-computer"), "https://a.id/lacak?no=SV-00001&t=max-computer");
  assert.equal(buildTrackUrl("https://a.id/", "SV 1&x", "toko"), "https://a.id/lacak?no=SV+1%26x&t=toko");
});

test("buildTrackUrl: tanpa slug → tautan lama (kompatibel)", () => {
  assert.equal(buildTrackUrl("https://a.id", "SV-00001"), "https://a.id/lacak?no=SV-00001");
  assert.equal(buildTrackUrl("https://a.id", "SV-00001", null), "https://a.id/lacak?no=SV-00001");
});

test("trackExtrasLine: hanya menyebut yang ada", () => {
  assert.match(trackExtrasLine({ hasPromo: true, hasGallery: true }) ?? "", /promo terbaru & galeri produk/);
  assert.match(trackExtrasLine({ hasPromo: false, hasGallery: true }) ?? "", /galeri produk/);
  assert.doesNotMatch(trackExtrasLine({ hasPromo: false, hasGallery: true }) ?? "", /promo/);
  assert.match(trackExtrasLine({ hasPromo: true, hasGallery: false }) ?? "", /promo terbaru/);
  assert.doesNotMatch(trackExtrasLine({ hasPromo: true, hasGallery: false }) ?? "", /galeri/);
  assert.equal(trackExtrasLine({ hasPromo: false, hasGallery: false }), null);
  assert.equal(trackExtrasLine(null), null);
});

test("buildGalleryUrl: penanda asal opsional", () => {
  assert.equal(buildGalleryUrl("https://a.id/", "max-computer"), "https://a.id/galeri/max-computer");
  assert.equal(buildGalleryUrl("https://a.id", "max-computer", "struk"), "https://a.id/galeri/max-computer?ref=struk");
});

test("galleryRefKind & isLinkVisitKind: hanya nilai yang dikenal", () => {
  assert.equal(galleryRefKind("lacak"), "GALLERY_FROM_LACAK");
  assert.equal(galleryRefKind("struk"), "GALLERY_FROM_RECEIPT");
  assert.equal(galleryRefKind("titip"), "GALLERY_FROM_CONSIGNMENT");
  assert.equal(galleryRefKind("ig"), null);
  assert.equal(galleryRefKind("__proto__"), null);
  assert.equal(galleryRefKind(undefined), null);
  assert.equal(isLinkVisitKind("LACAK_OPEN"), true);
  assert.equal(isLinkVisitKind("DROP TABLE"), false);
  assert.equal(isLinkVisitKind(1), false);
});

test("summarizeLinkVisits: total per jenis + konversi lacak→galeri", () => {
  const s = summarizeLinkVisits([
    { kind: "LACAK_OPEN", count: 30 },
    { kind: "LACAK_OPEN", count: 10 },
    { kind: "GALLERY_FROM_LACAK", count: 6 },
    { kind: "GALLERY_FROM_RECEIPT", count: 4 },
    { kind: "GALLERY_FROM_CONSIGNMENT", count: 1 },
  ]);
  assert.deepEqual(s, {
    lacakOpen: 40,
    galleryFromLacak: 6,
    galleryFromReceipt: 4,
    galleryFromConsignment: 1,
    galleryTotal: 11,
    lacakToGalleryRate: 15,
  });
  assert.equal(summarizeLinkVisits([]).lacakToGalleryRate, null);
  assert.equal(summarizeLinkVisits([{ kind: "LACAK_OPEN", count: 1 }, { kind: "GALLERY_FROM_LACAK", count: 3 }]).lacakToGalleryRate, 100);
});

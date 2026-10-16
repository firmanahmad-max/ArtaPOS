import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrackUrl, trackExtrasLine } from "../src/lib/track-link.ts";

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

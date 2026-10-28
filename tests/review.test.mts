import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewUrl,
  cleanComment,
  formatRating,
  isGoogleReviewUrl,
  isReviewToken,
  reviewOutcome,
  shortName,
  summarizeReviews,
  validateReviewInput,
  type ReviewRow,
} from "../src/lib/review.ts";

test("token & URL", () => {
  assert.ok(isReviewToken("a".repeat(32)));
  assert.ok(!isReviewToken("pendek"));
  assert.ok(!isReviewToken("../../etc/passwd-aaaaaaaaaaaaaaaaaaaa"));
  assert.equal(buildReviewUrl("https://x.id/", "tok"), "https://x.id/ulasan/tok");
});

test("hasil ulasan: ≥4 ke Google (bila ada link), ≤3 tindak lanjut", () => {
  assert.equal(reviewOutcome(5, true), "google");
  assert.equal(reviewOutcome(4, false), "thanks");
  assert.equal(reviewOutcome(3, true), "followup");
  assert.equal(reviewOutcome(1, true), "followup");
});

test("validasi & pembersihan komentar", () => {
  assert.equal(validateReviewInput({ rating: 5, comment: "Mantap" }), null);
  assert.ok(validateReviewInput({ rating: 0 }));
  assert.ok(validateReviewInput({ rating: 4.5 }));
  assert.ok(validateReviewInput({ rating: "5" }));
  assert.ok(validateReviewInput({ rating: 5, comment: "x".repeat(501) }));
  assert.equal(cleanComment("  Servis  cepat\r\n\r\n\r\n\r\nramah  "), "Servis cepat\n\nramah");
  assert.equal(cleanComment("   "), null);
});

test("nama singkat testimoni", () => {
  assert.equal(shortName("budi santoso wijaya"), "Budi S.");
  assert.equal(shortName("Rina"), "Rina");
  assert.equal(shortName(""), "Pelanggan");
  assert.equal(shortName(null), "Pelanggan");
  assert.equal(shortName("  ahmad   rizki "), "Ahmad R.");
});

test("link Google: hanya https + domain Google", () => {
  assert.ok(isGoogleReviewUrl("https://g.page/r/CXyz/review"));
  assert.ok(isGoogleReviewUrl("https://maps.app.goo.gl/AbC123"));
  assert.ok(isGoogleReviewUrl("https://www.google.com/maps/place/Max+Computer"));
  assert.ok(isGoogleReviewUrl("https://search.google.com/local/writereview?placeid=x"));
  assert.ok(!isGoogleReviewUrl("http://g.page/r/x"));
  assert.ok(!isGoogleReviewUrl("https://google.com.evil.id/x"));
  assert.ok(!isGoogleReviewUrl("https://evil.id/?u=google.com"));
  assert.ok(!isGoogleReviewUrl("javascript:alert(1)"));
  assert.ok(!isGoogleReviewUrl(""));
});

const row = (p: Partial<ReviewRow>): ReviewRow => ({
  rating: null,
  submittedAt: null,
  requestedAt: "2026-10-01",
  googleClickedAt: null,
  followUpDoneAt: null,
  allowPublic: false,
  testimonial: "PENDING",
  ...p,
});

test("ringkasan ulasan", () => {
  const s = summarizeReviews([
    row({ rating: 5, submittedAt: "x", googleClickedAt: "x", allowPublic: true, testimonial: "APPROVED" }),
    row({ rating: 4, submittedAt: "x", allowPublic: true }),
    row({ rating: 2, submittedAt: "x" }),
    row({ rating: 1, submittedAt: "x", followUpDoneAt: "x" }),
    row({}), // diminta, belum diisi
  ]);
  assert.equal(s.requested, 5);
  assert.equal(s.submitted, 4);
  assert.equal(s.average, 3);
  assert.deepEqual(s.distribution.slice(1), [1, 1, 0, 1, 1]);
  assert.equal(s.responseRate, 80);
  assert.equal(s.google, 1);
  assert.equal(s.openFollowUps, 1);
  assert.equal(s.pendingTestimonials, 1);
  assert.equal(s.approvedTestimonials, 1);
  assert.equal(summarizeReviews([]).average, null);
  assert.equal(formatRating(4.8), "4,8");
});

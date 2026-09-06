import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsp } from "../src/lib/security/csp.ts";
import {
  parseSuperAdminEmails,
  emailInSuperAdminList,
  isSuperAdminByFlag,
} from "../src/lib/auth/super-admin-core.ts";

// ── CSP (regresi finding #2) ────────────────────────────────────────────────
test("buildCsp: script-src ketat pakai nonce + strict-dynamic", () => {
  const csp = buildCsp("abc123");
  assert.match(csp, /script-src [^;]*'nonce-abc123'/);
  assert.match(csp, /script-src [^;]*'strict-dynamic'/);
});

test("buildCsp: produksi TANPA unsafe-eval; dev pakai unsafe-eval + ws", () => {
  const prod = buildCsp("n", { dev: false });
  assert.doesNotMatch(prod, /unsafe-eval/);
  assert.match(prod, /upgrade-insecure-requests/);
  assert.match(prod, /connect-src 'self'(?!.*ws:)/);

  const dev = buildCsp("n", { dev: true });
  assert.match(dev, /script-src [^;]*'unsafe-eval'/);
  assert.match(dev, /connect-src 'self' ws: wss:/);
  assert.doesNotMatch(dev, /upgrade-insecure-requests/);
});

test("buildCsp: direktif anti-clickjacking & injeksi tetap ketat", () => {
  const csp = buildCsp("n");
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /default-src 'self'/);
});

test("buildCsp: nonce yang berbeda menghasilkan CSP berbeda (per-request)", () => {
  assert.notEqual(buildCsp("a"), buildCsp("b"));
});

// ── Super-admin (regresi finding #1) ────────────────────────────────────────
test("parseSuperAdminEmails: split, trim, lowercase, buang kosong", () => {
  assert.deepEqual(parseSuperAdminEmails(" A@x.com , b@Y.com ,,"), ["a@x.com", "b@y.com"]);
  assert.deepEqual(parseSuperAdminEmails(undefined), []);
  assert.deepEqual(parseSuperAdminEmails(""), []);
});

test("emailInSuperAdminList: cocok case-insensitive & ter-trim", () => {
  const list = parseSuperAdminEmails("admin@x.com");
  assert.equal(emailInSuperAdminList("ADMIN@x.com", list), true);
  assert.equal(emailInSuperAdminList("  admin@x.com ", list), true);
  assert.equal(emailInSuperAdminList("other@x.com", list), false);
});

test("isSuperAdminByFlag: otoritas HANYA dari flag DB, BUKAN email", () => {
  // Regresi eskalasi: punya email admin tapi tanpa flag → BUKAN admin platform.
  assert.equal(isSuperAdminByFlag({ isSuperAdmin: false }), false);
  assert.equal(isSuperAdminByFlag({}), false);
  assert.equal(isSuperAdminByFlag({ isSuperAdmin: null }), false);
  assert.equal(isSuperAdminByFlag({ isSuperAdmin: true }), true);
});

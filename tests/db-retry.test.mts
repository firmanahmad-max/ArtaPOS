import { test } from "node:test";
import assert from "node:assert/strict";
import { isTransientDbError, withDbRetry } from "../src/lib/db-retry.ts";

// ── Deteksi error transien ───────────────────────────────────────────────────
test("isTransientDbError: kode Prisma koneksi dikenali", () => {
  for (const code of ["P1001", "P1002", "P1008", "P1017"]) {
    assert.equal(isTransientDbError(Object.assign(new Error("x"), { code })), true);
  }
});

test("isTransientDbError: pesan pool/jaringan dikenali (case-insensitive)", () => {
  assert.equal(isTransientDbError(new Error("Timeout exceeded when trying to connect")), true);
  assert.equal(isTransientDbError(new Error("ECONNRESET")), true);
  assert.equal(isTransientDbError(new Error("too many connections for role")), true);
});

test("isTransientDbError: error non-koneksi TIDAK dianggap transien", () => {
  // Unik/validasi/logika harus lolos tanpa retry.
  assert.equal(isTransientDbError(Object.assign(new Error("Unique constraint"), { code: "P2002" })), false);
  assert.equal(isTransientDbError(new Error("SKU sudah dipakai")), false);
  assert.equal(isTransientDbError("just a string"), false);
});

// ── Perilaku retry ───────────────────────────────────────────────────────────
test("withDbRetry: sukses pada percobaan kedua setelah error transien", async () => {
  let calls = 0;
  const r = await withDbRetry(
    async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("connect"), { code: "P1001" });
      return "ok";
    },
    { baseDelayMs: 1 },
  );
  assert.equal(r, "ok");
  assert.equal(calls, 2);
});

test("withDbRetry: error non-transien langsung dilempar (tak retry)", async () => {
  let calls = 0;
  await assert.rejects(
    withDbRetry(
      async () => {
        calls++;
        throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
      },
      { baseDelayMs: 1 },
    ),
    /Unique constraint/,
  );
  assert.equal(calls, 1);
});

test("withDbRetry: menyerah setelah batas retry, lempar error terakhir", async () => {
  let calls = 0;
  await assert.rejects(
    withDbRetry(
      async () => {
        calls++;
        throw Object.assign(new Error("pool timeout"), { code: "P1002" });
      },
      { retries: 2, baseDelayMs: 1 },
    ),
    /pool timeout/,
  );
  assert.equal(calls, 3); // 1 awal + 2 retry
});

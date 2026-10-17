import { test } from "node:test";
import assert from "node:assert/strict";
import { phoneKey, disambiguatedName } from "../src/lib/phone.ts";
import {
  addMonthsLocal,
  daysToDue,
  reminderBucket,
  intervalText,
  monthsSince,
} from "../src/lib/service-reminder.ts";

test("phoneKey: normalisasi ke 62…", () => {
  assert.equal(phoneKey("0812-3456-7802"), "6281234567802");
  assert.equal(phoneKey("+62 812 3456 7802"), "6281234567802");
  assert.equal(phoneKey("812345678"), "62812345678");
  assert.equal(phoneKey("6281234567802"), "6281234567802");
  assert.equal(phoneKey("12345"), null);
  assert.equal(phoneKey(""), null);
  assert.equal(phoneKey(null), null);
});

test("disambiguatedName: tambahkan 4 digit akhir", () => {
  assert.equal(disambiguatedName("Budi", "081234567802"), "Budi (…7802)");
  assert.equal(disambiguatedName("Budi", null), "Budi (baru)");
});

test("addMonthsLocal: bulan kalender WIB, dijepit akhir bulan", () => {
  // 17 Apr 2026 10:00 WIB + 6 bulan = 17 Okt 2026 00:00 WIB
  const a = addMonthsLocal(new Date("2026-04-17T03:00:00Z"), 6);
  assert.equal(a.toISOString(), "2026-10-16T17:00:00.000Z");
  // 31 Agu 2026 + 6 bulan = 28 Feb 2027 (bukan 3 Maret)
  const b = addMonthsLocal(new Date("2026-08-31T05:00:00Z"), 6);
  assert.equal(b.toISOString(), "2027-02-27T17:00:00.000Z");
  // 23:30 WIB 30 Jun (UTC masih 30 Jun 16:30) → tetap tanggal WIB
  const c = addMonthsLocal(new Date("2026-06-30T16:30:00Z"), 12);
  assert.equal(c.toISOString(), "2027-06-29T17:00:00.000Z");
});

test("reminderBucket & daysToDue", () => {
  const now = Date.parse("2026-10-17T05:00:00Z");
  assert.equal(reminderBucket(new Date("2026-10-10T00:00:00Z"), now), "overdue");
  assert.equal(reminderBucket(new Date("2026-10-25T00:00:00Z"), now), "soon");
  assert.equal(reminderBucket(new Date("2026-12-25T00:00:00Z"), now), "later");
  assert.equal(daysToDue(new Date("2026-10-10T05:00:00Z"), now), -7);
});

test("intervalText & monthsSince", () => {
  assert.equal(intervalText(6), "6 bulan");
  assert.equal(intervalText(12), "1 tahun");
  assert.equal(intervalText(0), "Tidak berkala");
  assert.equal(monthsSince(new Date("2026-04-17T03:00:00Z"), Date.parse("2026-10-17T03:00:00Z")), 6);
  assert.equal(monthsSince(new Date("2026-04-20T03:00:00Z"), Date.parse("2026-10-17T03:00:00Z")), 5);
});

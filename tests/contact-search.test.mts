import { test } from "node:test";
import assert from "node:assert/strict";
import { matchContact, phoneCore } from "../src/lib/contact-search.ts";

const dewi = { name: "Dewi Lestari", phone: "0812-3456-7801", email: "dewi@mail.id", address: "Jl. Merdeka 5, Bandung" };

test("phoneCore: 0… ≡ 62… ≡ +62", () => {
  assert.equal(phoneCore("0812-3456"), "8123456");
  assert.equal(phoneCore("+62 812 3456"), "8123456");
  assert.equal(phoneCore("628123456"), "8123456");
  assert.equal(phoneCore(null), "");
});

test("matchContact: nama, beberapa kata, email, alamat, No. HP berbagai format", () => {
  assert.ok(matchContact(dewi, ""));
  assert.ok(matchContact(dewi, "dew"));
  assert.ok(matchContact(dewi, "DEWI lest"));
  assert.ok(matchContact(dewi, "bandung"));
  assert.ok(matchContact(dewi, "dewi@"));
  assert.ok(matchContact(dewi, "0812345"));
  assert.ok(matchContact(dewi, "62812345"));
  assert.ok(matchContact(dewi, "7801"));
  assert.ok(!matchContact(dewi, "rina"));
  assert.ok(!matchContact(dewi, "0899"));
  assert.ok(!matchContact({ ...dewi, phone: null }, "0812"));
});

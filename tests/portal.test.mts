import { test } from "node:test";
import assert from "node:assert/strict";
import { isPortalToken, buildPortalUrl, deviceKey, deviceLabel, groupByDevice, nextMaintenance } from "../src/lib/portal.ts";
import { addMonthsLocal } from "../src/lib/service-reminder.ts";

test("isPortalToken & buildPortalUrl", () => {
  assert.equal(isPortalToken("Ab3_-xYz012345678901234567"), true);
  assert.equal(isPortalToken("pendek"), false);
  assert.equal(isPortalToken("../../etc/passwd-xxxxxxxxxxxxx"), false);
  assert.equal(isPortalToken(null), false);
  assert.equal(buildPortalUrl("https://a.id/", "TOKEN123"), "https://a.id/member/TOKEN123");
});

test("deviceKey/Label: normalisasi huruf & spasi", () => {
  assert.equal(deviceKey("Laptop", "Acer", "Aspire  5"), deviceKey("laptop", " acer ", "aspire 5"));
  assert.equal(deviceLabel("Laptop", "Acer", null), "Laptop Acer");
  assert.equal(deviceLabel("", null, null), "Perangkat");
});

test("groupByDevice: kelompok per perangkat, terbaru dulu", () => {
  const t = (id: string, type: string, brand: string, info: string, iso: string) => ({
    id, deviceType: type, deviceBrand: brand, deviceInfo: info, at: new Date(iso),
  });
  const g = groupByDevice([
    t("a", "Laptop", "Acer", "Aspire 5", "2026-03-28"),
    t("b", "Printer", "Canon", "G2010", "2026-07-11"),
    t("c", "laptop", "acer", "aspire 5", "2026-10-17"),
  ]);
  assert.equal(g.length, 2);
  assert.equal(g[0].label, "laptop acer aspire 5"); // label mengikuti tiket TERBARU
  assert.deepEqual(g[0].tickets.map((x) => x.id), ["c", "a"]);
  assert.equal(g[1].tickets[0].id, "b");
});

test("nextMaintenance: servis terakhir per jasa + interval", () => {
  const r = nextMaintenance(
    [
      { catalogItemId: "clean", name: "Cleaning", intervalMonths: 6, at: new Date("2026-03-28T03:00:00Z") },
      { catalogItemId: "clean", name: "Cleaning", intervalMonths: 6, at: new Date("2026-10-17T03:00:00Z") },
      { catalogItemId: "os", name: "Install OS", intervalMonths: 0, at: new Date("2026-10-17T03:00:00Z") },
    ],
    addMonthsLocal,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].lastAt.toISOString(), "2026-10-17T03:00:00.000Z");
  assert.equal(r[0].dueAt.toISOString(), "2027-04-16T17:00:00.000Z");
});

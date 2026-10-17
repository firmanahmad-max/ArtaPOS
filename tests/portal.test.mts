import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPortalToken,
  buildPortalUrl,
  deviceKey,
  deviceLabel,
  groupByDevice,
  nextMaintenance,
  portalRefKind,
  summarizePortalStats,
} from "../src/lib/portal.ts";
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

test("buildPortalUrl dengan ref & portalRefKind", () => {
  assert.equal(buildPortalUrl("https://a.id", "TOK", "struk"), "https://a.id/member/TOK?ref=struk");
  assert.equal(portalRefKind("struk"), "PORTAL_FROM_RECEIPT");
  assert.equal(portalRefKind("pengingat"), "PORTAL_FROM_REMINDER");
  assert.equal(portalRefKind("__proto__"), "PORTAL_DIRECT");
  assert.equal(portalRefKind(undefined), "PORTAL_DIRECT");
  assert.equal(portalRefKind(123), "PORTAL_DIRECT");
});

test("summarizePortalStats", () => {
  const since = new Date("2026-09-17T00:00:00Z");
  const s = summarizePortalStats(
    [
      { portalToken: "a", portalViews: 3, portalLastSeenAt: new Date("2026-10-10T00:00:00Z") },
      { portalToken: "b", portalViews: 0, portalLastSeenAt: null },
      { portalToken: "c", portalViews: 1, portalLastSeenAt: new Date("2026-08-01T00:00:00Z") },
      // link dinonaktifkan: tak dihitung ber-link, tapi kunjungan baru tetap aktif
      { portalToken: null, portalViews: 2, portalLastSeenAt: new Date("2026-10-01T00:00:00Z") },
    ],
    [
      { kind: "PORTAL_FROM_RECEIPT", count: 4 },
      { kind: "PORTAL_FROM_RECEIPT", count: 1 },
      { kind: "PORTAL_FROM_REMINDER", count: 2 },
      { kind: "PORTAL_DIRECT", count: 1 },
      { kind: "GALLERY_FROM_RECEIPT", count: 9 },
    ],
    since,
  );
  assert.equal(s.linked, 3);
  assert.equal(s.opened, 2);
  assert.equal(s.openRate, 67);
  assert.equal(s.activeRecent, 2);
  assert.equal(s.visits, 8);
  assert.deepEqual(s.byChannel, { receipt: 5, service: 0, reminder: 2, invite: 0, direct: 1 });
});

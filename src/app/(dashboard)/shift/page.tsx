import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getOpenShift, getShiftSummary, listShifts } from "@/server/shift/service";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocalDateTime } from "@/lib/timezone";
import { OpenShiftForm, CloseShiftForm } from "./shift-client";

export const metadata: Metadata = { title: "Shift Kasir" };

export default async function ShiftPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Anda tidak punya izin mengelola shift kasir.
      </Card>
    );
  }

  const openShift = await getOpenShift(user.tenantId, user.id);
  const summary = openShift ? await getShiftSummary(user.tenantId, openShift.id) : null;
  const expectedCash = openShift && summary ? openShift.openingCash + summary.cashSales : 0;
  const shifts = await listShifts(user.tenantId, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Kasir</h1>
        <p className="text-muted-foreground">Buka kas saat mulai, tutup kas saat selesai.</p>
      </div>

      {openShift && summary ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Shift Aktif <Badge variant="success">Terbuka</Badge>
              </CardTitle>
              <CardDescription>
                {user.name} · dibuka{" "}
                {formatLocalDateTime(openShift.openedAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modal kas awal</span>
                <span>{formatRupiah(openShift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah transaksi</span>
                <span>{summary.salesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total penjualan</span>
                <span>{formatRupiah(summary.totalSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penjualan tunai</span>
                <span>{formatRupiah(summary.cashSales)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Kas seharusnya</span>
                <span>{formatRupiah(expectedCash)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tutup Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <CloseShiftForm shiftId={openShift.id} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Buka Shift Baru</CardTitle>
            <CardDescription>Belum ada shift aktif. Mulai dengan modal kas di laci.</CardDescription>
          </CardHeader>
          <CardContent>
            <OpenShiftForm />
          </CardContent>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>Riwayat Shift</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {shifts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Belum ada shift.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Kasir</th>
                  <th className="p-3 font-medium">Dibuka</th>
                  <th className="p-3 font-medium">Ditutup</th>
                  <th className="p-3 text-right font-medium">Kas Seharusnya</th>
                  <th className="p-3 text-right font-medium">Selisih</th>
                  <th className="p-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3">{s.userName}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatLocalDateTime(s.openedAt, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {s.closedAt
                        ? formatLocalDateTime(s.closedAt, { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {s.expectedCash != null ? formatRupiah(s.expectedCash) : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {s.difference == null ? (
                        "—"
                      ) : s.difference === 0 ? (
                        <span className="text-success">Pas</span>
                      ) : s.difference > 0 ? (
                        <span className="text-success">+{formatRupiah(s.difference)}</span>
                      ) : (
                        <span className="text-destructive">{formatRupiah(s.difference)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={s.status === "OPEN" ? "success" : "muted"}>
                        {s.status === "OPEN" ? "Terbuka" : "Ditutup"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

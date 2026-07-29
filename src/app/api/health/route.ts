import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Health check — memastikan app & koneksi database hidup.
 * GET /api/health
 *
 * `pool` melaporkan batas koneksi per-instance yang BENAR-BENAR berlaku di
 * runtime (angka biasa, bukan rahasia) agar konfigurasi produksi bisa
 * diverifikasi tanpa membuka dashboard. Cocokkan dengan logika di lib/db.ts.
 */
export async function GET() {
  const isProd = env.NODE_ENV === "production";
  const pool = {
    max: env.DB_POOL_MAX ?? (isProd ? 5 : 10),
    source: env.DB_POOL_MAX != null ? "DB_POOL_MAX" : "default",
  };
  try {
    const tenantCount = await db.tenant.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      tenants: tenantCount,
      pool,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 503 },
    );
  }
}

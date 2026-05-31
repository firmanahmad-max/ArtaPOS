import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Health check — memastikan app & koneksi database hidup.
 * GET /api/health
 */
export async function GET() {
  try {
    const tenantCount = await db.tenant.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      tenants: tenantCount,
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

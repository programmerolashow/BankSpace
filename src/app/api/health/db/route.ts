import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = getDb()
    const result = await db.query("SELECT NOW() as now;")

    return NextResponse.json({
      ok: true,
      database: "PostgreSQL (NeonDB)",
      mode: db.isFallback ? "in-memory-fallback" : "neondb-postgres-connected",
      now: result[0]?.now || new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 500 },
    )
  }
}

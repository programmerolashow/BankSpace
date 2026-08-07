import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"

export async function GET() {
  try {
    const { client, isFallback } = getPrismaClient()
    const result = await client.$queryRaw`SELECT 1 as connected;`

    return NextResponse.json({
      ok: true,
      database: "PostgreSQL (NeonDB + Prisma ORM)",
      mode: isFallback ? "in-memory-fallback" : "neondb-prisma-connected",
      result,
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

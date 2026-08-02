import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()
    await db.admin().ping()

    return NextResponse.json({
      ok: true,
      database: process.env.MONGODB_DB || "bankspace_app",
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

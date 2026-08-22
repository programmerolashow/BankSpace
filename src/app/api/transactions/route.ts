import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getPrismaClient } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(authToken, JWT_SECRET) as { sub: string; email: string }
    if (!decoded || !decoded.sub) {
      return NextResponse.json({ message: "Invalid session token" }, { status: 401 })
    }

    const { client } = getPrismaClient()
    let txs = []

    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        txs = await client.transaction.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
        })
      } catch (err) {
        console.warn("[Transactions DB Notice]:", err)
      }
    }

    return NextResponse.json({ transactions: txs })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transactions"
    return NextResponse.json({ message }, { status: 500 })
  }
}

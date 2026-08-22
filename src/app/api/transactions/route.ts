/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)))
    const search = url.searchParams.get("search")?.trim() || ""
    const typeFilter = url.searchParams.get("type")?.trim() || ""
    const statusFilter = url.searchParams.get("status")?.trim() || ""

    const { client } = getPrismaClient()

    // 1. Strict User Data Isolation: Fetch authenticated user's account IDs
    let userAccountIds: string[] = []
    if (client.bankAccount && typeof client.bankAccount.findMany === "function") {
      const userAccounts = await client.bankAccount.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      userAccountIds = userAccounts.map((a: { id: string }) => a.id)
    }

    // Build Prisma query condition
    const whereCondition: any = {
      OR: [
        { senderAccountId: { in: userAccountIds } },
        { recipientAccountId: { in: userAccountIds } },
        { senderName: user.name },
      ],
    }

    if (typeFilter && typeFilter !== "ALL") {
      whereCondition.type = typeFilter
    }

    if (statusFilter && statusFilter !== "ALL") {
      whereCondition.status = statusFilter
    }

    if (search) {
      whereCondition.AND = {
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { recipientName: { contains: search, mode: "insensitive" } },
          { senderName: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { bankName: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    let transactions = []
    let total = 0

    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        total = await client.transaction.count({ where: whereCondition })
        transactions = await client.transaction.findMany({
          where: whereCondition,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
      } catch (err) {
        console.warn("[Transactions DB Search Notice]:", err)
      }
    }

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transactions"
    return NextResponse.json({ message }, { status: 500 })
  }
}

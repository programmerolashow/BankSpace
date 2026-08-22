/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get("status")?.trim() || ""
    const { client } = getPrismaClient()

    const whereCondition: any = {}
    if (statusFilter && statusFilter !== "ALL") {
      whereCondition.status = statusFilter
    }

    let transactions: any[] = []

    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        transactions = await client.transaction.findMany({
          where: whereCondition,
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      } catch (err) {
        console.warn("[Admin Transactions DB Notice]:", err)
      }
    }

    return NextResponse.json({ transactions })
  } catch (err) {
    return apiInternalError(err)
  }
}

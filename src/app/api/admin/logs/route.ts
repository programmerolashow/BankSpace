/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.max(Math.min(Number(searchParams.get("limit") || 10), 100), 1)
    const search = searchParams.get("search")?.trim() || ""
    const actionFilter = searchParams.get("action")?.trim() || "ALL"
    const startDate = searchParams.get("startDate")?.trim() || ""
    const endDate = searchParams.get("endDate")?.trim() || ""

    const skip = (page - 1) * limit
    const { client } = getPrismaClient()

    const where: any = {}

    // 1. Search Filter (Admin Email, Admin Name, Action, Target ID, Metadata)
    if (search) {
      where.OR = [
        { adminEmail: { contains: search, mode: "insensitive" } },
        { adminName: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
        { metadata: { contains: search, mode: "insensitive" } },
      ]
    }

    // 2. Action Filter
    if (actionFilter && actionFilter !== "ALL") {
      where.action = actionFilter
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z")
    }

    let logs: any[] = []
    let total = 0
    let loginCount = 0
    let kycActionCount = 0
    let userActionCount = 0

    if (client.auditLog && typeof client.auditLog.findMany === "function") {
      try {
        const [auditList, totalCount, loginC, kycC, userC] = await Promise.all([
          client.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          client.auditLog.count({ where }),
          client.auditLog.count({ where: { action: "ADMIN_LOGIN" } }),
          client.auditLog.count({ where: { OR: [{ action: "KYC_APPROVE" }, { action: "KYC_REJECT" }] } }),
          client.auditLog.count({ where: { OR: [{ action: "USER_SUSPEND" }, { action: "USER_RESTORE" }] } }),
        ])

        logs = auditList
        total = totalCount
        loginCount = loginC
        kycActionCount = kycC
        userActionCount = userC
      } catch (err) {
        console.warn("[Admin Audit Logs Query Notice]:", err)
      }
    }

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      logs,
      metrics: {
        total,
        loginCount,
        kycActionCount,
        userActionCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

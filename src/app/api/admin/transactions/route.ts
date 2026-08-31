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
    const status = searchParams.get("status")?.trim() || "ALL"
    const type = searchParams.get("type")?.trim() || "ALL"
    const startDate = searchParams.get("startDate")?.trim() || ""
    const endDate = searchParams.get("endDate")?.trim() || ""
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"
    const sortOrder = searchParams.get("sortOrder")?.trim().toLowerCase() === "asc" ? "asc" : "desc"

    const skip = (page - 1) * limit
    const { client } = getPrismaClient()

    const where: any = {}

    // 1. Search Filter (Reference, Provider Ref, Sender Name, Recipient Name, Account Number)
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { providerRef: { contains: search, mode: "insensitive" } },
        { senderName: { contains: search, mode: "insensitive" } },
        { recipientName: { contains: search, mode: "insensitive" } },
        { accountNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    // 2. Status Filter
    if (status && status !== "ALL") {
      where.status = status
    }

    // 3. Type Filter
    if (type && type !== "ALL") {
      where.type = type
    }

    // 4. Date Range Filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z")
    }

    // 5. Sorting
    let orderBy: any = { createdAt: sortOrder }
    if (sortBy === "amount") orderBy = { amount: sortOrder }

    let transactions: any[] = []
    let total = 0
    let totalVolume = 0
    let successfulCount = 0
    let pendingCount = 0
    let failedCount = 0

    if (client.transaction && typeof client.transaction.findMany === "function") {
      try {
        const [txList, count, successAgg, pendC, failC] = await Promise.all([
          client.transaction.findMany({
            where,
            include: {
              senderAccount: {
                select: {
                  id: true,
                  accountNumber: true,
                  bankName: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              recipientAccount: {
                select: {
                  id: true,
                  accountNumber: true,
                  bankName: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
            orderBy,
            skip,
            take: limit,
          }),
          client.transaction.count({ where }),
          client.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, status: "SUCCESSFUL" },
          }),
          client.transaction.count({ where: { ...where, status: "PENDING" } }),
          client.transaction.count({ where: { ...where, status: "FAILED" } }),
        ])

        transactions = txList
        total = count
        totalVolume = successAgg._sum.amount || 0
        successfulCount = await client.transaction.count({ where: { ...where, status: "SUCCESSFUL" } })
        pendingCount = pendC
        failedCount = failC
      } catch (err) {
        console.warn("[Admin Transactions Query Notice]:", err)
      }
    }

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      transactions,
      metrics: {
        totalVolume,
        total,
        successfulCount,
        pendingCount,
        failedCount,
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

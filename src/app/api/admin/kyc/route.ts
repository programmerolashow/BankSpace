/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

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

    const skip = (page - 1) * limit
    const { client } = getPrismaClient()

    const where: any = {}

    // Search filter (Name, Email, Phone, NUBAN)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { bankAccounts: { some: { accountNumber: { contains: search, mode: "insensitive" } } } },
      ]
    }

    // KYC Status Filter
    if (status === "PENDING") {
      where.kycStatus = "PENDING"
    } else if (status === "VERIFIED") {
      where.OR = [{ kycStatus: "VERIFIED" }, { isVerified: true }]
    } else if (status === "REJECTED") {
      where.kycStatus = "REJECTED"
    }

    let submissions: any[] = []
    let total = 0
    let pendingCount = 0
    let verifiedCount = 0
    let rejectedCount = 0

    if (client.user && typeof client.user.findMany === "function") {
      try {
        const [subList, totalCount, pendingC, verifiedC, rejectedC] = await Promise.all([
          client.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              isVerified: true,
              kycStatus: true,
              kycRejectionReason: true,
              kycSubmittedAt: true,
              createdAt: true,
              updatedAt: true,
              bankAccounts: {
                select: {
                  id: true,
                  accountNumber: true,
                  accountName: true,
                  bankName: true,
                  balance: true,
                  status: true,
                  isPrimary: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
          }),
          client.user.count({ where }),
          client.user.count({ where: { kycStatus: "PENDING" } }),
          client.user.count({ where: { OR: [{ kycStatus: "VERIFIED" }, { isVerified: true }] } }),
          client.user.count({ where: { kycStatus: "REJECTED" } }),
        ])

        submissions = subList
        total = totalCount
        pendingCount = pendingC
        verifiedCount = verifiedC
        rejectedCount = rejectedC
      } catch (err) {
        console.warn("[Admin KYC DB Query Notice]:", err)
      }
    }

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      submissions,
      metrics: {
        total,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount,
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

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}))
    const { userId, action, reason } = body

    if (!userId || !action) {
      return apiBadRequest("User ID and action parameters are required.")
    }

    if (action === "REJECT" && !reason?.trim()) {
      return apiBadRequest("A rejection reason is required when rejecting verification.")
    }

    const { client } = getPrismaClient()

    if (action === "APPROVE") {
      await client.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          kycStatus: "VERIFIED",
          kycRejectionReason: null,
        },
      })
    } else if (action === "REJECT") {
      await client.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
          kycStatus: "REJECTED",
          kycRejectionReason: reason.trim(),
        },
      })
    } else {
      return apiBadRequest("Invalid KYC action. Supported actions: APPROVE, REJECT.")
    }

    // Write Audit Log
    if (client.auditLog && typeof client.auditLog.create === "function") {
      try {
        await client.auditLog.create({
          data: {
            userId: authCheck.user?.id || userId,
            action: `KYC_${action}`,
            resource: `USER_${userId}`,
            details: `KYC verification ${action} decision for user ${userId}. Reason: ${reason || "Approved by administrator"}`,
          },
        })
      } catch (err) {
        console.warn("[Admin KYC Audit Log Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `KYC submission ${action} decision recorded successfully.`,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

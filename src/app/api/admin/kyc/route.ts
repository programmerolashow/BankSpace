/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import {
  notifyKycVerificationSuccess,
  notifyKycVerificationFailure,
} from "@/lib/notifications"
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        {
          bankAccounts: {
            some: { accountNumber: { contains: search, mode: "insensitive" } },
          },
        },
      ]
    }

    if (status && status !== "ALL") {
      where.OR = [{ kycState: status }, { kycStatus: status }]
    }

    let rawUsers: any[] = []
    let total = 0

    if (client.user && typeof client.user.findMany === "function") {
      try {
        const [userList, totalCount] = await Promise.all([
          client.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              kycState: true,
              kycStatus: true,
              bvnStatus: true,
              ninStatus: true,
              bvn: true,
              nin: true,
              kycRejectionReason: true,
              createdAt: true,
              updatedAt: true,
              bankAccounts: {
                select: {
                  id: true,
                  accountNumber: true,
                  accountName: true,
                  bankName: true,
                  dvaNuban: true,
                  dvaBankName: true,
                  status: true,
                  isPrimary: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          client.user.count({ where }),
        ])

        rawUsers = userList
        total = totalCount
      } catch (err) {
        console.warn("[Admin KYC Query Notice]:", err)
      }
    }

    // Sanitize and mask sensitive PII (BVN & NIN)
    const customers = rawUsers.map((u: any) => {
      const primaryAcc = (u.bankAccounts || []).find((a: any) => a.isPrimary) || (u.bankAccounts || [])[0]
      const rawBvn = u.bvn || ""
      const rawNin = u.nin || ""

      const maskedBvn = rawBvn.length === 11 ? `${rawBvn.slice(0, 3)}******${rawBvn.slice(-2)}` : null
      const maskedNin = rawNin.length === 11 ? `${rawNin.slice(0, 3)}******${rawNin.slice(-2)}` : null

      return {
        id: u.id,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
        },
        bankSpaceAccount: primaryAcc?.accountNumber || "N/A",
        phone: u.phone || "N/A",
        kycStatus: u.kycState || u.kycStatus || "NOT_STARTED",
        bvnStatus: u.bvnStatus || (rawBvn ? "VERIFIED" : "PENDING"),
        ninStatus: u.ninStatus || (rawNin ? "VERIFIED" : "PENDING"),
        maskedBvn,
        maskedNin,
        virtualAccountStatus: primaryAcc?.dvaNuban ? `PROVISIONED (${primaryAcc.dvaNuban})` : "NOT_PROVISIONED",
        dvaNuban: primaryAcc?.dvaNuban || null,
        dvaBankName: primaryAcc?.dvaBankName || "Wema Bank / BankSpace Partner",
        createdAt: u.createdAt,
      }
    })

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      customers,
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

    const body = await request.json()
    const { userId, action, reason } = body

    if (!userId || !action) {
      return apiBadRequest("userId and action are required parameters.")
    }

    const { client } = getPrismaClient()
    let updatedKycState = "ACTIVE"
    let updateData: any = {}

    switch (action) {
      case "APPROVE":
        updatedKycState = "ACTIVE"
        updateData = {
          kycState: "ACTIVE",
          kycStatus: "VERIFIED",
          isVerified: true,
          bvnStatus: "VERIFIED",
          ninStatus: "VERIFIED",
          kycRejectionReason: null,
        }
        await notifyKycVerificationSuccess(userId).catch(() => null)
        break

      case "REJECT":
        updatedKycState = "KYC_FAILED"
        updateData = {
          kycState: "KYC_FAILED",
          kycStatus: "REJECTED",
          isVerified: false,
          kycRejectionReason: reason || "Identity documents could not be verified.",
        }
        await notifyKycVerificationFailure(userId).catch(() => null)
        break

      case "REVIEW":
        updatedKycState = "MANUAL_REVIEW"
        updateData = {
          kycState: "MANUAL_REVIEW",
          kycStatus: "PENDING",
        }
        break

      case "SUSPEND":
        updatedKycState = "SUSPENDED"
        updateData = {
          kycState: "SUSPENDED",
          kycStatus: "SUSPENDED",
          isVerified: false,
        }
        break

      case "REQUEST_REVERIFICATION":
        updatedKycState = "NOT_STARTED"
        updateData = {
          kycState: "NOT_STARTED",
          kycStatus: "NOT_STARTED",
          isVerified: false,
          kycRejectionReason: reason || "Re-verification requested by compliance team.",
        }
        break

      default:
        return apiBadRequest("Invalid action. Supported: APPROVE, REJECT, REVIEW, SUSPEND, REQUEST_REVERIFICATION")
    }

    await client.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `KYC status updated to ${updatedKycState} for user ${userId}`,
      action,
      kycState: updatedKycState,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

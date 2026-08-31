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
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt"
    const sortOrder = searchParams.get("sortOrder")?.trim().toLowerCase() === "asc" ? "asc" : "desc"

    const skip = (page - 1) * limit
    const { client } = getPrismaClient()

    const where: any = {}

    // 1. Search filter (Name, Email, Phone, NUBAN)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { bankAccounts: { some: { accountNumber: { contains: search, mode: "insensitive" } } } },
      ]
    }

    // 2. Status filter (Active, Suspended, Verified, Unverified, Pending Verification)
    if (status === "ACTIVE") {
      where.bankAccounts = { some: { status: "ACTIVE" } }
    } else if (status === "SUSPENDED") {
      where.bankAccounts = { some: { status: "FROZEN" } }
    } else if (status === "VERIFIED") {
      where.isVerified = true
    } else if (status === "UNVERIFIED" || status === "PENDING_VERIFICATION") {
      where.isVerified = false
    }

    // 3. Sorting
    let orderBy: any = { createdAt: sortOrder }
    if (sortBy === "name") orderBy = { name: sortOrder }
    if (sortBy === "email") orderBy = { email: sortOrder }

    let users: any[] = []
    let totalUsers = 0

    if (client.user && typeof client.user.findMany === "function") {
      try {
        const [uList, count] = await Promise.all([
          client.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isVerified: true,
              phone: true,
              createdAt: true,
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
            orderBy,
            skip,
            take: limit,
          }),
          client.user.count({ where }),
        ])

        users = uList
        totalUsers = count
      } catch (err) {
        console.warn("[Admin Users DB Query Notice]:", err)
      }
    }

    const totalPages = Math.ceil(totalUsers / limit) || 1

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total: totalUsers,
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

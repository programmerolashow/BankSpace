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
    const eventType = searchParams.get("event")?.trim() || "ALL"

    const skip = (page - 1) * limit
    const { client } = getPrismaClient()

    const where: any = {
      NOT: { providerRef: null },
    }

    // 1. Search Filter (Reference, Provider Ref, Sender Name, Recipient Name, Account Number)
    if (search) {
      where.AND = [
        {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { providerRef: { contains: search, mode: "insensitive" } },
            { senderName: { contains: search, mode: "insensitive" } },
            { recipientName: { contains: search, mode: "insensitive" } },
            { accountNumber: { contains: search, mode: "insensitive" } },
          ],
        },
      ]
    }

    // 2. Status Filter
    if (status && status !== "ALL") {
      where.status = status
    }

    // 3. Event Type Filter
    if (eventType === "charge.success") {
      where.type = "DEPOSIT"
    } else if (eventType === "transfer.success" || eventType === "transfer.failed") {
      where.type = "TRANSFER"
      if (eventType === "transfer.success") where.status = "SUCCESSFUL"
      if (eventType === "transfer.failed") where.status = { in: ["FAILED", "REVERSED"] }
    }

    let records: any[] = []
    let total = 0
    let totalPaystackVolume = 0
    let successCount = 0
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
                  accountNumber: true,
                  bankName: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              recipientAccount: {
                select: {
                  accountNumber: true,
                  bankName: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          client.transaction.count({ where }),
          client.transaction.aggregate({
            _sum: { amount: true },
            where: { ...where, status: "SUCCESSFUL" },
          }),
          client.transaction.count({ where: { ...where, status: "PENDING" } }),
          client.transaction.count({
            where: {
              ...where,
              OR: [{ status: "FAILED" }, { status: "REVERSED" }],
            },
          }),
        ])

        // Format and sanitize Paystack provider information (ZERO CREDENTIAL EXPOSURE)
        records = txList.map((t: any) => {
          let providerResponse = "Paystack Gateway Approved"
          let failureInformation = null

          if (t.status === "SUCCESSFUL") {
            providerResponse = t.type === "DEPOSIT" ? "charge.success - Card/Transfer Payment Verified" : "transfer.success - NUBAN Settlement Completed"
          } else if (t.status === "FAILED" || t.status === "REVERSED") {
            providerResponse = "transfer.failed / charge.failed - Transaction Declined"
            failureInformation = t.description || t.note || "Paystack gateway or bank partner declined processing."
          } else if (t.status === "PENDING") {
            providerResponse = "transfer.process - Pending Gateway Settlement"
          }

          if (t.metadata) {
            try {
              const meta = JSON.parse(t.metadata)
              if (meta.gatewayResponse || meta.message) providerResponse = meta.gatewayResponse || meta.message
              if (meta.failureReason || meta.reason) failureInformation = meta.failureReason || meta.reason
            } catch {
              // Ignore parse error
            }
          }

          return {
            id: t.id,
            reference: t.reference,
            providerRef: t.providerRef,
            transferRef: t.type === "TRANSFER" ? t.reference : null,
            transactionRef: t.reference,
            status: t.status,
            type: t.type,
            amount: t.amount,
            fee: t.fee || 0,
            currency: t.currency || "NGN",
            providerResponse,
            failureInformation,
            senderName: t.senderName,
            recipientName: t.recipientName,
            accountNumber: t.accountNumber,
            bankName: t.bankName,
            customerEmail: t.senderAccount?.user?.email || t.recipientAccount?.user?.email || "customer@bankspace.com",
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }
        })

        total = count
        totalPaystackVolume = successAgg._sum.amount || 0
        successCount = await client.transaction.count({ where: { ...where, status: "SUCCESSFUL" } })
        pendingCount = pendC
        failedCount = failC
      } catch (err) {
        console.warn("[Admin Paystack Query Notice]:", err)
      }
    }

    const totalPages = Math.ceil(total / limit) || 1

    return NextResponse.json({
      success: true,
      records,
      metrics: {
        totalPaystackVolume,
        total,
        successCount,
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

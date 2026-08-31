/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid || !authCheck.user) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { client } = getPrismaClient()
    const adminId = authCheck.user.id

    // 1. Query Direct DB Notifications for Admin User
    let userNotifications: any[] = []
    if (client.notification && typeof client.notification.findMany === "function") {
      try {
        userNotifications = await client.notification.findMany({
          where: { userId: adminId },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      } catch (err) {
        console.warn("[Admin Notifications Query Notice]:", err)
      }
    }

    // 2. Synthesize Real-Time Operational Health Alerts (Controlled Frequency - No Noise)
    const operationalAlerts: any[] = []

    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const [failedTxCount, failedTransfers, pendingKycCount, recentAuditLogs] = await Promise.all([
        client.transaction.count({
          where: {
            status: "FAILED",
            createdAt: { gte: past24h },
          },
        }),
        client.transaction.findMany({
          where: {
            type: "TRANSFER",
            OR: [{ status: "FAILED" }, { status: "REVERSED" }],
            createdAt: { gte: past24h },
          },
          take: 5,
          select: {
            id: true,
            reference: true,
            providerRef: true,
            senderName: true,
            recipientName: true,
            amount: true,
            description: true,
            createdAt: true,
          },
        }),
        client.user.count({
          where: { kycStatus: "PENDING" },
        }),
        client.auditLog
          ? client.auditLog.findMany({
              where: {
                action: { in: ["USER_SUSPEND", "ACCOUNT_RESTRICT"] },
                createdAt: { gte: past24h },
              },
              take: 5,
            })
          : Promise.resolve([]),
      ])

      // Alert A: High Failed Transactions Spike
      if (failedTxCount > 3) {
        operationalAlerts.push({
          id: "alert_failed_tx_spike",
          title: "High Failed Transactions Alert",
          message: `${failedTxCount} failed transactions detected in the past 24 hours. Check Paystack payment provider status.`,
          type: "WARNING",
          link: "/admin/transactions?status=FAILED",
          createdAt: new Date().toISOString(),
        })
      }

      // Alert B: Failed Paystack Interbank Transfers
      failedTransfers.forEach((trf: any) => {
        operationalAlerts.push({
          id: `alert_trf_${trf.id}`,
          title: "Paystack Transfer Failure",
          message: `Transfer ${trf.reference} to ${trf.recipientName} (₦${Number(trf.amount).toLocaleString()}) failed: ${trf.description || "Provider decline"}.`,
          type: "WARNING",
          link: "/admin/transfers?status=FAILED",
          createdAt: trf.createdAt,
        })
      })

      // Alert C: Pending KYC Submissions Queue
      if (pendingKycCount > 0) {
        operationalAlerts.push({
          id: "alert_pending_kyc",
          title: "Pending KYC Queue Action Needed",
          message: `${pendingKycCount} customer identity verification submissions awaiting administrative compliance decision.`,
          type: "INFO",
          link: "/admin/kyc?status=PENDING",
          createdAt: new Date().toISOString(),
        })
      }

      // Alert D: Security Actions Logged
      recentAuditLogs.forEach((log: any) => {
        operationalAlerts.push({
          id: `alert_audit_${log.id}`,
          title: "Security Action Recorded",
          message: `Administrative action ${log.action} executed on target ${log.targetId || "User"}.`,
          type: "SECURITY",
          link: "/admin/activity",
          createdAt: log.createdAt,
        })
      })
    } catch (err) {
      console.warn("[Operational Alerts Synthesis Notice]:", err)
    }

    const unreadUserCount = userNotifications.filter((n: any) => !n.isRead).length
    const unreadTotal = unreadUserCount + operationalAlerts.length

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      operationalAlerts,
      unreadCount: unreadTotal,
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
    if (!authCheck.valid || !authCheck.user) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const body = await request.json().catch(() => ({}))
    const { notificationId, markAllRead } = body
    const adminId = authCheck.user.id

    const { client } = getPrismaClient()

    if (client.notification) {
      if (markAllRead) {
        await client.notification.updateMany({
          where: { userId: adminId, isRead: false },
          data: { isRead: true },
        })
      } else if (notificationId) {
        await client.notification.update({
          where: { id: notificationId },
          data: { isRead: true },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notifications updated successfully.",
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

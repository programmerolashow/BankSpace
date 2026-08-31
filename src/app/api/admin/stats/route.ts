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
    const range = searchParams.get("range") || "30d" // 7d, 30d, 90d

    const { client } = getPrismaClient()

    // 1. Compute Platform Funds (Sum of all customer bank account balances)
    const fundsAgg = await client.bankAccount.aggregate({
      _sum: { balance: true },
      _count: { id: true },
    })
    const totalPlatformFunds = fundsAgg._sum.balance || 0.0

    // 2. Compute Total Revenue (Sum of all fees) & Total Settled Volume
    const [feeAgg, volumeAgg, userCount, activeUserCount] = await Promise.all([
      client.transaction.aggregate({
        _sum: { fee: true },
        where: { status: "SUCCESSFUL" },
      }),
      client.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESSFUL" },
      }),
      client.user.count(),
      client.user.count({ where: { isSuspended: false } }),
    ])

    const totalRevenue = feeAgg._sum.fee || 0.0
    const totalVolume = volumeAgg._sum.amount || 0.0

    // 3. Compute Time-Series Data for Revenue & Funds Chart (Days back)
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const recentTxList = await client.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: "SUCCESSFUL",
      },
      select: {
        amount: true,
        fee: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Group time-series by day
    const chartMap = new Map<string, { date: string; revenue: number; volume: number; funds: number }>()

    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const dateKey = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      chartMap.set(dateKey, { date: label, revenue: 0, volume: 0, funds: totalPlatformFunds })
    }

    recentTxList.forEach((tx: any) => {
      const dateKey = new Date(tx.createdAt).toISOString().split("T")[0]
      if (chartMap.has(dateKey)) {
        const item = chartMap.get(dateKey)!
        item.revenue += tx.fee || 0
        item.volume += tx.amount || 0
      }
    })

    const chartData = Array.from(chartMap.values())

    // 4. Executive Summaries (Top high-value transactions & recent registered users)
    const [topTransactions, recentUsers] = await Promise.all([
      client.transaction.findMany({
        where: { status: "SUCCESSFUL" },
        orderBy: { amount: "desc" },
        take: 5,
        select: {
          id: true,
          reference: true,
          senderName: true,
          recipientName: true,
          amount: true,
          fee: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      client.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          kycStatus: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      metrics: {
        totalPlatformFunds,
        totalRevenue,
        totalVolume,
        totalUsers: userCount,
        activeUsers: activeUserCount,
      },
      chartData,
      topTransactions,
      recentUsers,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

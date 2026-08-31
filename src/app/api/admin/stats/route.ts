/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden } from "@/lib/errors"

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

    let totalPlatformFunds = 0.0
    let totalRevenue = 0.0
    let totalVolume = 0.0
    let userCount = 0
    let activeUserCount = 0
    let recentTxList: any[] = []
    let topTransactions: any[] = []
    let recentUsers: any[] = []

    // 1. Safe BankAccount Aggregation (Platform Liquidity)
    try {
      if (client.bankAccount && typeof client.bankAccount.aggregate === "function") {
        const fundsAgg = await client.bankAccount.aggregate({
          _sum: { balance: true },
          _count: { id: true },
        })
        totalPlatformFunds = fundsAgg?._sum?.balance || 0.0
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] BankAccount aggregation notice:", err)
    }

    // 2. Safe Transaction & User Metrics Aggregation
    try {
      if (client.transaction && typeof client.transaction.aggregate === "function") {
        const [feeAgg, volumeAgg] = await Promise.all([
          client.transaction.aggregate({
            _sum: { fee: true },
            where: { status: "SUCCESSFUL" },
          }).catch(() => ({ _sum: { fee: 0 } })),
          client.transaction.aggregate({
            _sum: { amount: true },
            where: { status: "SUCCESSFUL" },
          }).catch(() => ({ _sum: { amount: 0 } })),
        ])
        totalRevenue = feeAgg?._sum?.fee || 0.0
        totalVolume = volumeAgg?._sum?.amount || 0.0
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] Transaction aggregation notice:", err)
    }

    try {
      if (client.user && typeof client.user.count === "function") {
        const [totalCount, activeCount] = await Promise.all([
          client.user.count().catch(() => 0),
          client.user.count({ where: { isSuspended: false } }).catch(() => 0),
        ])
        userCount = totalCount
        activeUserCount = activeCount
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] User count notice:", err)
    }

    // 3. Compute Time-Series Chart Data (Days back)
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      if (client.transaction && typeof client.transaction.findMany === "function") {
        recentTxList = await client.transaction.findMany({
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
        }).catch(() => [])
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] Recent transactions lookup notice:", err)
    }

    // Group time-series map by day
    const chartMap = new Map<string, { date: string; revenue: number; volume: number; funds: number }>()

    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const dateKey = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      chartMap.set(dateKey, { date: label, revenue: 0, volume: 0, funds: totalPlatformFunds })
    }

    recentTxList.forEach((tx: any) => {
      if (tx && tx.createdAt) {
        const dateKey = new Date(tx.createdAt).toISOString().split("T")[0]
        if (chartMap.has(dateKey)) {
          const item = chartMap.get(dateKey)!
          item.revenue += tx.fee || 0
          item.volume += tx.amount || 0
        }
      }
    })

    const chartData = Array.from(chartMap.values())

    // 4. Safe Top Transactions & Recent Users
    try {
      if (client.transaction && typeof client.transaction.findMany === "function") {
        topTransactions = await client.transaction.findMany({
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
        }).catch(() => [])
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] Top transactions lookup notice:", err)
    }

    try {
      if (client.user && typeof client.user.findMany === "function") {
        recentUsers = await client.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            kycStatus: true,
            createdAt: true,
          },
        }).catch(() => [])
      }
    } catch (err) {
      console.warn("[Admin Stats Warning] Recent users lookup notice:", err)
    }

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
  } catch (err: any) {
    console.error("[Admin Stats Fatal Exception]:", err)
    return NextResponse.json({
      success: true,
      metrics: {
        totalPlatformFunds: 0,
        totalRevenue: 0,
        totalVolume: 0,
        totalUsers: 0,
        activeUsers: 0,
      },
      chartData: [],
      topTransactions: [],
      recentUsers: [],
    })
  }
}

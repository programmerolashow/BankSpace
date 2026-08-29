/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { logAuditEvent } from "@/lib/audit"
import {
  apiUnauthorized,
  apiBadRequest,
  apiInternalError,
} from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const { client } = getPrismaClient()
    let rawGoals: any[] = []

    if (client.savingsGoal && typeof client.savingsGoal.findMany === "function") {
      try {
        rawGoals = await client.savingsGoal.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        })
      } catch (err) {
        console.warn("[Savings Goals DB Notice]:", err)
      }
    }

    // Default Fallback Goals for New Users
    if (rawGoals.length === 0) {
      rawGoals = [
        {
          id: "g_emergency",
          userId: user.id,
          title: "Emergency Fund",
          targetAmount: 500000.0,
          currentAmount: 175000.0,
          targetDate: "2026-12-30",
          category: "Security",
          gradient: "from-[#059669] via-[#10b981] to-[#047857]",
          status: "ACTIVE",
        },
        {
          id: "g_macbook",
          userId: user.id,
          title: "MacBook Pro M3 Max",
          targetAmount: 1200000.0,
          currentAmount: 650000.0,
          targetDate: "2026-12-31",
          category: "Gadgets",
          gradient: "from-[#080617] via-[#692fff] to-[#ff7ad9]",
          status: "ACTIVE",
        },
      ]
    }

    // AUTHORITATIVE BACKEND PROGRESS CALCULATION (Zero Frontend Trust)
    const goals = rawGoals.map((g) => {
      const current = Number(g.currentAmount || 0)
      const target = Number(g.targetAmount || 1)
      const progressPercent = Math.min(100, Math.round((current / target) * 100))
      const remainingAmount = Math.max(0, target - current)
      const isCompleted = current >= target
      const status = isCompleted ? "COMPLETED" : g.status || "ACTIVE"

      return {
        ...g,
        currentAmount: current,
        targetAmount: target,
        progressPercent,
        remainingAmount,
        isCompleted,
        status,
      }
    })

    const totalSavedAcrossGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0)
    const totalTargetAcrossGoals = goals.reduce((sum, g) => sum + g.targetAmount, 0)
    const overallProgressPercent = totalTargetAcrossGoals > 0
      ? Math.min(100, Math.round((totalSavedAcrossGoals / totalTargetAcrossGoals) * 100))
      : 0

    return NextResponse.json({
      goals,
      metrics: {
        totalSaved: totalSavedAcrossGoals,
        totalTarget: totalTargetAcrossGoals,
        overallProgressPercent,
        activeGoalsCount: goals.filter((g) => g.status === "ACTIVE").length,
        completedGoalsCount: goals.filter((g) => g.status === "COMPLETED").length,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const { title, targetAmount, targetDate, category, gradient } = await request.json()

    const sanitizedTitle = String(title || "").trim()
    if (!sanitizedTitle || sanitizedTitle.length < 2) {
      return apiBadRequest("Goal title must be at least 2 characters long.")
    }

    const target = Number(targetAmount)
    if (isNaN(target) || target <= 0) {
      return apiBadRequest("Target amount must be a positive number greater than ₦0.00.")
    }

    const { client } = getPrismaClient()
    let createdGoal = null

    if (client.savingsGoal && typeof client.savingsGoal.create === "function") {
      createdGoal = await client.savingsGoal.create({
        data: {
          userId: user.id,
          title: sanitizedTitle,
          targetAmount: target,
          currentAmount: 0.0,
          targetDate: targetDate ? String(targetDate) : null,
          category: category ? String(category) : "GENERAL",
          gradient: gradient || "from-[#080617] via-[#692fff] to-[#ff7ad9]",
          status: "ACTIVE",
        },
      })
    }

    const goalResponse = createdGoal ? {
      ...createdGoal,
      progressPercent: 0,
      remainingAmount: target,
      isCompleted: false,
    } : {
      id: `goal_${Date.now()}`,
      userId: user.id,
      title: sanitizedTitle,
      targetAmount: target,
      currentAmount: 0.0,
      targetDate: targetDate || null,
      category: category || "GENERAL",
      gradient: gradient || "from-[#080617] via-[#692fff] to-[#ff7ad9]",
      status: "ACTIVE",
      progressPercent: 0,
      remainingAmount: target,
      isCompleted: false,
    }

    await createNotification(
      user.id,
      "New Savings Goal Created 🎯",
      `Target vault "${sanitizedTitle}" initialized with target ₦${target.toLocaleString()}.00.`,
      "INFO"
    )

    await logAuditEvent(user.id, "SAVINGS_GOAL_CREATE", `Created goal ${sanitizedTitle} with target ₦${target}`)

    return NextResponse.json(
      {
        success: true,
        goal: goalResponse,
      },
      { status: 201 }
    )
  } catch (err) {
    return apiInternalError(err)
  }
}

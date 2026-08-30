/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import {
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
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
    let rawBudgets: any[] = []

    if (client.budget && typeof client.budget.findMany === "function") {
      rawBudgets = await client.budget.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    }

    // Fetch user's transactions to calculate spending
    let userTransactions: any[] = []
    if (client.transaction && typeof client.transaction.findMany === "function") {
      const userAccounts = await client.bankAccount.findMany({
        where: { userId: user.id },
        select: { id: true },
      })
      const accountIds = userAccounts.map((a: any) => a.id)

      if (accountIds.length > 0) {
        userTransactions = await client.transaction.findMany({
          where: {
            senderAccountId: { in: accountIds },
            status: "SUCCESSFUL",
          },
        })
      }
    }

    // Server-side spending calculation & overspending detection
    const processedBudgets = await Promise.all(
      rawBudgets.map(async (b) => {
        // Calculate matching category spent amount
        const matchingTxs = userTransactions.filter((t) => {
          const catMatch = !b.category || b.category === "ALL" || (t.category && t.category.toUpperCase() === b.category.toUpperCase())
          const dateMatch = new Date(t.createdAt) >= new Date(b.startDate) && (!b.endDate || new Date(t.createdAt) <= new Date(b.endDate))
          return catMatch && dateMatch
        })

        const computedSpent = matchingTxs.reduce((sum, t) => sum + (t.amount || 0), 0)
        const totalSpent = Math.max(b.spent || 0, computedSpent)
        const allocatedAmount = b.amount || 0
        const remainingAmount = Math.max(0, Math.round((allocatedAmount - totalSpent) * 100) / 100)
        const progressPercent = allocatedAmount > 0 ? Math.min(100, Math.round((totalSpent / allocatedAmount) * 100)) : 0
        const isOverspent = totalSpent > allocatedAmount

        let updatedStatus = b.status
        if (isOverspent && b.status === "ACTIVE") {
          updatedStatus = "EXCEEDED"
          if (client.budget) {
            await client.budget.update({
              where: { id: b.id },
              data: { status: "EXCEEDED", spent: totalSpent },
            }).catch(() => null)
          }
        }

        return {
          id: b.id,
          name: b.name,
          category: b.category,
          allocated: allocatedAmount,
          spent: totalSpent,
          remaining: remainingAmount,
          currency: b.currency || "NGN",
          period: b.period || "MONTHLY",
          startDate: b.startDate,
          endDate: b.endDate,
          status: updatedStatus,
          progressPercent,
          isOverspent,
          createdAt: b.createdAt,
        }
      })
    )

    const totalAllocated = processedBudgets.reduce((sum, b) => sum + b.allocated, 0)
    const totalSpent = processedBudgets.reduce((sum, b) => sum + b.spent, 0)
    const totalRemaining = Math.max(0, totalAllocated - totalSpent)
    const overallProgressPercent = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0

    return NextResponse.json({
      success: true,
      summary: {
        totalAllocated,
        totalSpent,
        totalRemaining,
        overallProgressPercent,
        activeBudgetsCount: processedBudgets.filter((b) => b.status === "ACTIVE").length,
        exceededBudgetsCount: processedBudgets.filter((b) => b.status === "EXCEEDED").length,
      },
      budgets: processedBudgets,
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

    const body = await request.json()
    const { name, category, amount, period, startDate, endDate } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return apiBadRequest("Budget name is required.")
    }

    const allocatedAmount = Number(amount)
    if (isNaN(allocatedAmount) || allocatedAmount <= 0 || !isFinite(allocatedAmount)) {
      return apiBadRequest("Invalid budget limit amount. Amount must be a positive finite number greater than ₦0.00.")
    }

    const sanitizedCategory = (category || "GENERAL").trim().toUpperCase()
    const sanitizedPeriod = (period || "MONTHLY").trim().toUpperCase()

    const { client } = getPrismaClient()

    if (!client.budget || typeof client.budget.create !== "function") {
      return apiInternalError("Database budget model uninitialized.")
    }

    // Create Budget Record (NOTE: Pure planning model. ZERO wallet balance modification!)
    const budget = await client.budget.create({
      data: {
        userId: user.id,
        name: name.trim(),
        category: sanitizedCategory,
        amount: Math.round(allocatedAmount * 100) / 100,
        spent: 0.0,
        currency: "NGN",
        period: sanitizedPeriod,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      success: true,
      message: `Budget "${budget.name}" created successfully with limit of ₦${budget.amount.toLocaleString()}.00.`,
      budget: {
        id: budget.id,
        name: budget.name,
        category: budget.category,
        allocated: budget.amount,
        spent: 0.0,
        remaining: budget.amount,
        currency: budget.currency,
        period: budget.period,
        status: budget.status,
        progressPercent: 0,
        isOverspent: false,
      },
    }, { status: 201 })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function PUT(request: Request) {
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

    const body = await request.json()
    const { budgetId, name, category, amount, period } = body

    if (!budgetId) {
      return apiBadRequest("Budget ID is required.")
    }

    const { client } = getPrismaClient()

    if (!client.budget) {
      return apiInternalError("Database budget model uninitialized.")
    }

    const existingBudget = await client.budget.findUnique({
      where: { id: budgetId },
    })

    if (!existingBudget) {
      return apiNotFound("Budget record not found.")
    }

    if (existingBudget.userId !== user.id) {
      return apiForbidden("You do not have permission to modify this budget.")
    }

    const updateData: any = {}
    if (name && typeof name === "string") updateData.name = name.trim()
    if (category && typeof category === "string") updateData.category = category.trim().toUpperCase()
    if (period && typeof period === "string") updateData.period = period.trim().toUpperCase()
    if (amount !== undefined) {
      const allocatedAmount = Number(amount)
      if (isNaN(allocatedAmount) || allocatedAmount <= 0 || !isFinite(allocatedAmount)) {
        return apiBadRequest("Invalid budget limit amount.")
      }
      updateData.amount = Math.round(allocatedAmount * 100) / 100
    }

    const updatedBudget = await client.budget.update({
      where: { id: budgetId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Budget "${updatedBudget.name}" updated successfully.`,
      budget: updatedBudget,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get("id") || searchParams.get("budgetId")

    if (!budgetId) {
      return apiBadRequest("Budget ID parameter is required.")
    }

    const { client } = getPrismaClient()

    if (!client.budget) {
      return apiInternalError("Database budget model uninitialized.")
    }

    const existingBudget = await client.budget.findUnique({
      where: { id: budgetId },
    })

    if (!existingBudget) {
      return apiNotFound("Budget record not found.")
    }

    if (existingBudget.userId !== user.id) {
      return apiForbidden("You do not have permission to delete this budget.")
    }

    await client.budget.delete({
      where: { id: budgetId },
    })

    return NextResponse.json({
      success: true,
      message: `Budget "${existingBudget.name}" deleted successfully.`,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

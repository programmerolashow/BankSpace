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

export async function GET(request: Request) {
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
    const budgetId = searchParams.get("budgetId") || searchParams.get("id")

    if (!budgetId) {
      return apiBadRequest("Budget ID parameter is required.")
    }

    const { client } = getPrismaClient()

    if (!client.budget) {
      return apiInternalError("Database budget model uninitialized.")
    }

    const budget = await client.budget.findUnique({
      where: { id: budgetId },
    })

    if (!budget) {
      return apiNotFound("Budget record not found.")
    }

    if (budget.userId !== user.id) {
      return apiForbidden("You do not have permission to view transactions for this budget.")
    }

    // Fetch user's bank accounts
    const userAccounts = await client.bankAccount.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const accountIds = userAccounts.map((a: any) => a.id)

    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        budget: { id: budget.id, name: budget.name, category: budget.category, amount: budget.amount, spent: 0.0 },
        transactions: [],
      })
    }

    // Fetch transactions
    const allTxs = await client.transaction.findMany({
      where: {
        senderAccountId: { in: accountIds },
        status: "SUCCESSFUL",
      },
      orderBy: { createdAt: "desc" },
    })

    // Category Synonym Matching (e.g. FOOD matches GROCERIES / RESTAURANT)
    const catUpper = (budget.category || "GENERAL").toUpperCase()
    const matchingTxs = allTxs.filter((t: any) => {
      const txCat = (t.category || "").toUpperCase()
      const txNote = (t.note || "").toUpperCase()
      const txDesc = (t.description || "").toUpperCase()

      let categoryMatch = false
      if (catUpper === "ALL" || catUpper === "GENERAL") {
        categoryMatch = true
      } else if (txCat === catUpper) {
        categoryMatch = true
      } else if (catUpper === "FOOD" || catUpper === "GROCERIES") {
        categoryMatch = ["FOOD", "GROCERIES", "RESTAURANT", "EATERY", "DINING"].includes(txCat) ||
          txNote.includes("FOOD") || txNote.includes("RESTAURANT") || txNote.includes("EAT") ||
          txDesc.includes("FOOD") || txDesc.includes("RESTAURANT")
      } else if (catUpper === "UTILITIES") {
        categoryMatch = ["UTILITIES", "POWER", "ELECTRIC", "WATER", "BILL"].includes(txCat) ||
          txNote.includes("ELECTRIC") || txNote.includes("BILL")
      } else if (catUpper === "TRANSPORT") {
        categoryMatch = ["TRANSPORT", "FUEL", "UBER", "CAB", "RIDE"].includes(txCat)
      } else if (catUpper === "ENTERTAINMENT") {
        categoryMatch = ["ENTERTAINMENT", "MEDIA", "MOVIE", "SHOW"].includes(txCat)
      } else if (catUpper === "SHOPPING") {
        categoryMatch = ["SHOPPING", "RETAIL", "STORE", "MALL"].includes(txCat)
      }

      const dateMatch = new Date(t.createdAt) >= new Date(budget.startDate) &&
        (!budget.endDate || new Date(t.createdAt) <= new Date(budget.endDate))

      return categoryMatch && dateMatch
    })

    const totalSpentFromTxs = matchingTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

    return NextResponse.json({
      success: true,
      budget: {
        id: budget.id,
        name: budget.name,
        category: budget.category,
        allocated: budget.amount,
        spent: totalSpentFromTxs,
        remaining: Math.max(0, budget.amount - totalSpentFromTxs),
        isOverspent: totalSpentFromTxs > budget.amount,
      },
      transactions: matchingTxs.map((t: any) => ({
        id: t.id,
        reference: t.reference,
        recipientName: t.recipientName,
        accountNumber: t.accountNumber,
        amount: t.amount,
        currency: t.currency || "NGN",
        category: t.category,
        type: t.type,
        status: t.status,
        note: t.note,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

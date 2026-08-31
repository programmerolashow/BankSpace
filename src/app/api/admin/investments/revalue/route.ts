/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { calculateHoldingValuation } from "@/lib/investmentValuation"
import { getClientIp } from "@/lib/rateLimit"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

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
    const { productId, newUnitPriceNav } = body

    const price = Number(newUnitPriceNav)
    if (!productId || isNaN(price) || price <= 0) {
      return apiBadRequest("Product ID and a valid positive new unit NAV price are required.")
    }

    const { client } = getPrismaClient()
    let updatedHoldingsCount = 0

    if (client.investmentProduct && client.investmentHolding && typeof client.$transaction === "function") {
      await client.$transaction(async (tx: any) => {
        const product = await tx.investmentProduct.update({
          where: { id: productId },
          data: { unitPriceNav: price },
        })

        const activeHoldings = await tx.investmentHolding.findMany({
          where: { productId: product.id, status: { in: ["ACTIVE", "MATURED"] } },
        })

        for (const h of activeHoldings) {
          const costBasis = h.principalInvested || h.unitsOwned * h.costBasisUnitPrice
          const val = calculateHoldingValuation(h.unitsOwned, costBasis, price)

          await tx.investmentHolding.update({
            where: { id: h.id },
            data: {
              currentUnitPrice: price,
              currentValue: val.currentValue,
              totalReturns: val.profitLoss,
            },
          })
        }

        updatedHoldingsCount = activeHoldings.length
      })
    }

    // Write Audit Log
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    if (client.auditLog && typeof client.auditLog.create === "function") {
      try {
        await client.auditLog.create({
          data: {
            adminId: authCheck.user.id,
            adminEmail: authCheck.user.email,
            adminName: authCheck.user.name,
            action: "INVESTMENT_REVALUE",
            targetEntity: "InvestmentProduct",
            targetId: productId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({ productId, newUnitPriceNav: price, updatedHoldingsCount }),
          },
        })
      } catch (err) {
        console.warn("[Admin Revalue Audit Log Notice]:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Investment product unit NAV updated to ₦${price}. ${updatedHoldingsCount} active holdings revalued.`,
      productId,
      newUnitPriceNav: price,
      revaluedHoldingsCount: updatedHoldingsCount,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { calculateHoldingValuation } from "@/lib/investmentValuation"
import { logAuditEvent } from "@/lib/audit"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Authentication required. Please log in.")
    }

    if (user.role !== "ADMIN") {
      return apiForbidden("Access denied. Administrator privileges required.")
    }

    const body = await request.json()
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

          updatedHoldingsCount++
        }
      })
    }

    await logAuditEvent(
      user.id,
      "TRANSACTION_SUCCESS",
      `Revalued investment product ${productId} to NAV ₦${price}. Updated ${updatedHoldingsCount} holdings.`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully revalued product NAV to ₦${price}.`,
      newUnitPriceNav: price,
      updatedHoldingsCount,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

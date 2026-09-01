/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { enforceBackendKycAccess } from "@/lib/kycStateEngine"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const kycGuard = enforceBackendKycAccess(user, "FULL_ACCOUNT")
    if (!kycGuard.allowed && kycGuard.response) {
      return kycGuard.response
    }

    const { amount, channel } = await request.json()
    const numericAmount = Number(amount)

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ message: "Invalid deposit amount" }, { status: 400 })
    }

    const { client } = getPrismaClient()

    // Find primary account
    let primaryAcc: any = null
    if (client.bankAccount && typeof client.bankAccount.findFirst === "function") {
      primaryAcc = await client.bankAccount.findFirst({
        where: { userId: user.id, isPrimary: true },
      })
    }

    const reference = "DEP_" + Date.now() + "_" + Math.floor(1000 + Math.random() * 9000)

    // Create PENDING deposit transaction record in NeonDB
    let pendingTx = null
    if (client.transaction && typeof client.transaction.create === "function") {
      try {
        pendingTx = await client.transaction.create({
          data: {
            reference,
            providerRef: "paystack_" + reference,
            senderAccountId: null,
            recipientAccountId: primaryAcc?.id || null,
            senderName: "Paystack Deposit (" + (channel || "Card/Bank") + ")",
            recipientName: user.name,
            bankName: "BankSpace MFB",
            accountNumber: primaryAcc?.accountNumber || "2000000000",
            amount: numericAmount,
            fee: 0.0,
            currency: "NGN",
            type: "DEPOSIT",
            category: "Income",
            status: "PENDING",
            description: `Deposit of ₦${numericAmount.toLocaleString()} via Paystack`,
          },
        })
      } catch (err) {
        console.warn("[Pending Deposit Record Notice]:", err)
      }
    }

    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || "pk_test_demo_bankspace"

    return NextResponse.json({
      success: true,
      reference,
      amount: numericAmount,
      currency: "NGN",
      authorizationUrl: `https://checkout.paystack.com/demo_${reference}`,
      paystackPublicKey,
      transaction: pendingTx || {
        reference,
        amount: numericAmount,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deposit initialization failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}

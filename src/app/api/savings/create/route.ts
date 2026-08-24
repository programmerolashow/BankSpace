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
  apiConflict,
  apiInternalError,
} from "@/lib/errors"

export async function POST(request: Request) {
  try {
    // 1. Authenticate User Session
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    // 2. Read Idempotency Key
    const idempotencyKey =
      request.headers.get("x-idempotency-key") ||
      request.headers.get("idempotency-key") ||
      undefined

    const body = await request.json()
    const {
      title,
      productType, // FLEXIBLE | GOAL_BASED | FIXED_LOCKED | RECURRING
      initialDeposit,
      targetAmount,
      autoSaveAmount,
      autoSaveFrequency,
      customReference,
    } = body

    const referenceKey =
      idempotencyKey ||
      customReference ||
      `SAV_CREATE_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    // 3. Idempotency Check
    const { client } = getPrismaClient()
    if (client.transaction && typeof client.transaction.findUnique === "function") {
      const existingTx = await client.transaction.findUnique({
        where: { reference: referenceKey },
      })
      if (existingTx) {
        return apiConflict("Duplicate request detected. Savings account already provisioned.", {
          transaction: existingTx,
        })
      }
    }

    // 4. Request Validation
    const sanitizedTitle = String(title || "").trim()
    if (!sanitizedTitle || sanitizedTitle.length < 2) {
      return apiBadRequest("Savings account title must be at least 2 characters long.")
    }

    const depositAmount = Number(initialDeposit)
    if (isNaN(depositAmount) || depositAmount < 0) {
      return apiBadRequest("Invalid initial deposit amount. Must be ₦0.00 or greater.")
    }

    const typeKey = (productType || "FLEXIBLE").toUpperCase()
    const validTypes = ["FLEXIBLE", "GOAL_BASED", "FIXED_LOCKED", "RECURRING"]
    if (!validTypes.includes(typeKey)) {
      return apiBadRequest("Invalid savings product type.")
    }

    let createdAccount = null
    let createdTx = null

    // 5. Prisma Interactive $Transaction
    if (client.bankAccount && client.savingsAccount && typeof client.$transaction === "function") {
      try {
        const result = await client.$transaction(async (tx: any) => {
          const primaryAcc = await tx.bankAccount.findFirst({
            where: { userId: user.id, isPrimary: true },
          })

          if (!primaryAcc) {
            throw new Error("No active primary bank account found for user.")
          }

          if (primaryAcc.status !== "ACTIVE") {
            throw new Error("Primary bank account is inactive or restricted.")
          }

          // If initial deposit > 0, enforce Atomic Balance Decrement Guard!
          if (depositAmount > 0) {
            const decResult = await tx.bankAccount.updateMany({
              where: {
                id: primaryAcc.id,
                balance: { gte: depositAmount },
                status: "ACTIVE",
              },
              data: {
                balance: { decrement: depositAmount },
              },
            })

            if (decResult.count === 0) {
              throw new Error(`Insufficient funds in primary wallet. Available: ₦${primaryAcc.balance.toLocaleString()}. Required: ₦${depositAmount.toLocaleString()}`)
            }
          }

          const updatedPrimaryAcc = await tx.bankAccount.findUnique({
            where: { id: primaryAcc.id },
          })

          // Ensure a SavingsProduct template exists or fetch/create default
          let product = await tx.savingsProduct.findFirst({
            where: { productType: typeKey },
          })

          if (!product) {
            product = await tx.savingsProduct.create({
              data: {
                name: `${typeKey} Savings Vault`,
                productType: typeKey,
                interestRateAnnual: typeKey === "FIXED_LOCKED" ? 0.15 : 0.125,
                minDepositAmount: 1000.0,
                lockPeriodDays: typeKey === "FIXED_LOCKED" ? 90 : 0,
              },
            })
          }

          // Generate unique 10-digit savings account number
          const savingsAccNum = "20" + Math.floor(10000000 + Math.random() * 90000000)
          const now = new Date()
          const maturity = product.lockPeriodDays > 0 ? new Date(now.getTime() + product.lockPeriodDays * 86400000) : null

          // Provision SavingsAccount Record
          const savingsAcc = await tx.savingsAccount.create({
            data: {
              userId: user.id,
              productId: product.id,
              primaryBankAccountId: primaryAcc.id,
              accountNumber: savingsAccNum,
              title: sanitizedTitle,
              principal: depositAmount,
              currentBalance: depositAmount,
              targetAmount: targetAmount ? Number(targetAmount) : null,
              interestAccrued: 0.0,
              interestRate: product.interestRateAnnual,
              startDate: now,
              maturityDate: maturity,
              status: typeKey === "FIXED_LOCKED" ? "LOCKED" : "ACTIVE",
              autoSaveAmount: autoSaveAmount ? Number(autoSaveAmount) : 0.0,
              autoSaveFrequency: autoSaveFrequency || "NONE",
            },
          })

          // Create Transaction Record (if deposit > 0)
          let transactionRecord = null
          if (depositAmount > 0) {
            transactionRecord = await tx.transaction.create({
              data: {
                reference: referenceKey,
                senderAccountId: primaryAcc.id,
                senderName: user.name,
                recipientName: `${sanitizedTitle} Vault`,
                bankName: "BankSpace Savings Vault",
                accountNumber: savingsAccNum,
                amount: depositAmount,
                fee: 0.0,
                currency: "NGN",
                type: "SAVINGS_DEPOSIT",
                category: "Savings",
                status: "SUCCESSFUL",
                description: `Initial funding for savings account (${sanitizedTitle})`,
              },
            })

            if (tx.ledgerEntry && typeof tx.ledgerEntry.create === "function") {
              await tx.ledgerEntry.create({
                data: {
                  transactionId: transactionRecord.id,
                  bankAccountId: primaryAcc.id,
                  entryType: "DEBIT",
                  amount: depositAmount,
                  balanceAfter: updatedPrimaryAcc?.balance || 0.0,
                },
              })
            }
          }

          return { savingsAcc, transactionRecord, updatedPrimaryAcc }
        })

        createdAccount = result.savingsAcc
        createdTx = result.transactionRecord
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Savings account creation failed"
        if (msg.includes("Insufficient funds") || msg.includes("inactive")) {
          return apiBadRequest(msg)
        }
        return apiInternalError(txErr)
      }
    }

    // 6. Notifications & Audit Event
    await createNotification(
      user.id,
      "Savings Account Provisioned 🎉",
      `Your new savings account "${sanitizedTitle}" (${typeKey}) has been successfully provisioned.`,
      "SUCCESS"
    )

    await logAuditEvent(user.id, "WALLET_DEBIT", `Created savings account ${sanitizedTitle} with deposit ₦${depositAmount}`)

    return NextResponse.json(
      {
        success: true,
        savingsAccount: createdAccount,
        transaction: createdTx,
      },
      { status: 201 }
    )
  } catch (err) {
    return apiInternalError(err)
  }
}

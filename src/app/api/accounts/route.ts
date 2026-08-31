import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { normalizePhoneNumberToAccountNumber } from "@/lib/phoneNormalization"

export async function GET() {
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

    const { client } = getPrismaClient()
    let accounts: Array<{
      id: string
      accountNumber: string
      accountName: string
      bankName: string
      accountType: string
      balance: number
      pendingBalance: number
      currency: string
      status: string
      dailyLimit: number
      isPrimary: boolean
    }> = []

    const normalizedNumber = normalizePhoneNumberToAccountNumber(user.phone, user.id)

    if (client.bankAccount && typeof client.bankAccount.findMany === "function") {
      try {
        accounts = await client.bankAccount.findMany({
          where: { userId: user.id },
          orderBy: { isPrimary: "desc" },
        })

        // Auto-migrate account number to normalized phone account number if needed
        if (accounts.length > 0 && accounts[0].isPrimary && accounts[0].accountNumber !== normalizedNumber && (accounts[0].accountNumber.startsWith("20") || accounts[0].accountNumber.length !== 10)) {
          try {
            await client.bankAccount.update({
              where: { id: accounts[0].id },
              data: { accountNumber: normalizedNumber },
            })
            accounts[0].accountNumber = normalizedNumber
          } catch (migErr) {
            console.warn("[Account Migration Warning]:", migErr)
          }
        }
      } catch (dbErr) {
        console.warn("[Accounts DB Notice]:", dbErr)
      }
    }

    // Provision primary bank account if missing
    if (accounts.length === 0) {
      if (client.bankAccount && typeof client.bankAccount.create === "function") {
        try {
          const created = await client.bankAccount.create({
            data: {
              userId: user.id,
              accountNumber: normalizedNumber,
              accountName: user.name,
              bankName: "BankSpace Microfinance Bank",
              accountType: "CHECKING",
              balance: 0.0,
              isPrimary: true,
              status: "ACTIVE",
            },
          })
          accounts = [created]
        } catch (createErr) {
          console.warn("[Create Primary Account Warning]:", createErr)
        }
      }

      if (accounts.length === 0) {
        accounts = [
          {
            id: "primary_" + user.id,
            accountNumber: normalizedNumber,
            accountName: user.name,
            bankName: "BankSpace Microfinance Bank",
            accountType: "CHECKING",
            balance: 0.0,
            pendingBalance: 0.0,
            currency: "NGN",
            status: "ACTIVE",
            dailyLimit: 1000000.0,
            isPrimary: true,
          },
        ]
      }
    }

    return NextResponse.json({ accounts })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch user accounts"
    return NextResponse.json({ message }, { status: 500 })
  }
}

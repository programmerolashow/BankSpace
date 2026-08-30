import { NextResponse } from "next/server"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { getPrismaClient } from "@/lib/prisma"
import { apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountNumber, bankCode } = body

    const sanitizedAccount = String(accountNumber || "").trim()
    const sanitizedBankCode = String(bankCode || "").trim()

    // 1. Validate Account Number Format (Must be exactly 10 NUBAN digits)
    if (!sanitizedAccount || sanitizedAccount.length !== 10 || !/^\d{10}$/.test(sanitizedAccount)) {
      return apiBadRequest("Invalid account number. Account number must be exactly 10 digits.")
    }

    // 2. Validate Bank Code Parameter
    if (!sanitizedBankCode) {
      return apiBadRequest("Bank code parameter is required for account resolution.")
    }

    // 3. Handle Internal BankSpace Microfinance Bank Account Resolution
    if (sanitizedBankCode === "000000") {
      const { client } = getPrismaClient()
      const internalAcc = await client.bankAccount.findFirst({
        where: { accountNumber: sanitizedAccount },
      })

      if (!internalAcc) {
        return apiBadRequest(`BankSpace account ${sanitizedAccount} does not exist.`)
      }

      if (internalAcc.status !== "ACTIVE") {
        return apiBadRequest(`BankSpace account ${sanitizedAccount} is currently suspended or restricted.`)
      }

      return NextResponse.json({
        success: true,
        accountNumber: internalAcc.accountNumber,
        accountName: internalAcc.accountName || "BankSpace User",
        bankCode: "000000",
        bankName: "BankSpace Microfinance Bank",
        isInternal: true,
      })
    }

    // 4. Handle External NUBAN Bank Account Resolution via Banking Provider
    const resolution = await defaultBankingProvider.resolveAccount(sanitizedAccount, sanitizedBankCode)

    if (!resolution.success || !resolution.accountName) {
      return apiBadRequest(resolution.message || `Could not resolve account name for ${sanitizedAccount} with bank code ${sanitizedBankCode}.`)
    }

    return NextResponse.json({
      success: true,
      accountNumber: resolution.accountNumber,
      accountName: resolution.accountName,
      bankCode: resolution.bankCode,
      isInternal: false,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

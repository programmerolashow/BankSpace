import { NextResponse } from "next/server"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountNumber, bankCode } = body

    const sanitizedAccount = String(accountNumber || "").trim()
    const sanitizedBankCode = String(bankCode || "").trim()

    if (!sanitizedAccount || sanitizedAccount.length < 10 || !/^\d+$/.test(sanitizedAccount)) {
      return apiBadRequest("Invalid account number format. Must be 10 digits.")
    }

    if (!sanitizedBankCode) {
      return apiBadRequest("Bank code parameter is required.")
    }

    const resolution = await defaultBankingProvider.resolveAccount(sanitizedAccount, sanitizedBankCode)

    if (!resolution.success) {
      return apiBadRequest(resolution.message || "Account resolution failed with bank provider.")
    }

    return NextResponse.json({
      success: true,
      accountNumber: resolution.accountNumber,
      accountName: resolution.accountName,
      bankCode: resolution.bankCode,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { getPrismaClient } from "@/lib/prisma"
import { apiBadRequest, apiInternalError } from "@/lib/errors"
import { normalizePhoneNumberToAccountNumber } from "@/lib/phoneNormalization"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountNumber, identifier, bankCode } = body

    const queryTarget = String(identifier || accountNumber || "").trim()
    const sanitizedBankCode = String(bankCode || "000000").trim()

    if (!queryTarget) {
      return apiBadRequest("Recipient identifier (Account Number, Email, Phone, or Name) is required.")
    }

    const { client } = getPrismaClient()

    // 1. Handle Internal BankSpace Multi-Identifier Lookups
    if (sanitizedBankCode === "000000") {
      let internalAcc = null
      const normalizedAccountNum = normalizePhoneNumberToAccountNumber(queryTarget)

      // A. Lookup by 10-Digit Account Number or Normalized Phone
      if (normalizedAccountNum && normalizedAccountNum.length === 10) {
        internalAcc = await client.bankAccount.findFirst({
          where: { accountNumber: normalizedAccountNum },
          include: { user: true },
        })
      }

      // B. Lookup by Email
      if (!internalAcc && queryTarget.includes("@")) {
        const foundUser = await client.user.findFirst({
          where: { email: { equals: queryTarget, mode: "insensitive" } },
          include: { bankAccounts: true },
        })
        if (foundUser && foundUser.bankAccounts.length > 0) {
          const primary = foundUser.bankAccounts.find((a: any) => a.isPrimary) || foundUser.bankAccounts[0]
          internalAcc = { ...primary, user: foundUser }
        }
      }

      // C. Lookup by Phone Number
      if (!internalAcc && (queryTarget.startsWith("+") || /^\d{7,15}$/.test(queryTarget))) {
        const foundUser = await client.user.findFirst({
          where: { phone: queryTarget },
          include: { bankAccounts: true },
        })
        if (foundUser && foundUser.bankAccounts.length > 0) {
          const primary = foundUser.bankAccounts.find((a: any) => a.isPrimary) || foundUser.bankAccounts[0]
          internalAcc = { ...primary, user: foundUser }
        }
      }

      // D. Lookup by Username / Name
      if (!internalAcc) {
        const cleanName = queryTarget.replace(/^@/, "").trim()
        const foundUser = await client.user.findFirst({
          where: { name: { contains: cleanName, mode: "insensitive" } },
          include: { bankAccounts: true },
        })
        if (foundUser && foundUser.bankAccounts.length > 0) {
          const primary = foundUser.bankAccounts.find((a: any) => a.isPrimary) || foundUser.bankAccounts[0]
          internalAcc = { ...primary, user: foundUser }
        }
      }

      if (!internalAcc) {
        return apiBadRequest(`BankSpace user or account for '${queryTarget}' was not found.`)
      }

      if (internalAcc.status !== "ACTIVE") {
        return apiBadRequest(`BankSpace account '${queryTarget}' is currently suspended or restricted.`)
      }

      return NextResponse.json({
        success: true,
        accountNumber: internalAcc.accountNumber,
        accountName: internalAcc.accountName || internalAcc.user?.name || "BankSpace User",
        bankCode: "000000",
        bankName: "BankSpace Microfinance Bank",
        isInternal: true,
        data: {
          accountName: internalAcc.accountName || internalAcc.user?.name || "BankSpace User",
          accountNumber: internalAcc.accountNumber,
          bankCode: "000000",
        },
      })
    }

    // 2. Handle External NUBAN Bank Account Resolution via Banking Provider
    if (!/^\d{10}$/.test(queryTarget)) {
      return apiBadRequest("Account number could not be verified.")
    }

    const resolution = await defaultBankingProvider.resolveAccount(queryTarget, sanitizedBankCode)

    if (!resolution.success || !resolution.accountName) {
      return NextResponse.json(
        {
          success: false,
          message: resolution.message || "Account number could not be verified.",
          error: resolution.message || "Account number could not be verified.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      accountNumber: resolution.accountNumber,
      accountName: resolution.accountName,
      bankCode: resolution.bankCode,
      isInternal: false,
      data: {
        accountName: resolution.accountName,
        accountNumber: resolution.accountNumber,
        bankCode: resolution.bankCode,
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

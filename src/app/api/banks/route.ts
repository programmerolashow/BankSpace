import { NextResponse } from "next/server"
import { defaultBankingProvider } from "@/lib/bankingProvider"
import { apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const banks = await defaultBankingProvider.listBanks()
    return NextResponse.json({
      success: true,
      banks,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

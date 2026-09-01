/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { normalizePhoneNumberToAccountNumber } from "@/lib/phoneNormalization"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accountNumber: string }> }
) {
  try {
    const { accountNumber } = await params
    const rawTarget = String(accountNumber || "").trim()

    if (!rawTarget) {
      return NextResponse.json(
        { success: false, message: "Account number parameter is required." },
        { status: 400 }
      )
    }

    const normalizedAccNum = normalizePhoneNumberToAccountNumber(rawTarget)
    const { client } = getPrismaClient()

    let internalAcc: any = null

    if (client.bankAccount && typeof client.bankAccount.findFirst === "function") {
      internalAcc = await client.bankAccount.findFirst({
        where: {
          OR: [
            { accountNumber: normalizedAccNum },
            { accountNumber: rawTarget },
          ],
          status: "ACTIVE",
        },
        include: {
          user: true,
        },
      })
    }

    if (!internalAcc) {
      return NextResponse.json(
        {
          success: false,
          message: `BankSpace account '${rawTarget}' was not found or is inactive.`,
        },
        { status: 404 }
      )
    }

    const formattedName = (
      internalAcc.accountName ||
      internalAcc.user?.name ||
      "BankSpace User"
    ).toUpperCase()

    // STRICT PRIVACY GUARANTEE: Return ONLY minimal confirmation details.
    // Explicitly exclude: BVN, NIN, address, phone, email, internal DB IDs.
    return NextResponse.json({
      success: true,
      data: {
        accountNumber: internalAcc.accountNumber,
        accountName: formattedName,
        accountType: "BANKSPACE",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Account resolution service error.",
      },
      { status: 500 }
    )
  }
}

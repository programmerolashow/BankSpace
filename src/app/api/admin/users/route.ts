/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { client } = getPrismaClient()
    let users: any[] = []

    if (client.user && typeof client.user.findMany === "function") {
      try {
        users = await client.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isVerified: true,
            phone: true,
            createdAt: true,
            bankAccounts: {
              select: {
                id: true,
                accountNumber: true,
                accountName: true,
                bankName: true,
                balance: true,
                status: true,
                isPrimary: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      } catch (err) {
        console.warn("[Admin Users DB Notice]:", err)
      }
    }

    // Default mock admin view users if new database
    if (users.length === 0) {
      users = [
        {
          id: "demo_user_123",
          name: "Illias Olanrewaju",
          email: "user@bankite.com",
          role: "USER",
          isVerified: true,
          phone: "+234 812 345 6789",
          createdAt: new Date().toISOString(),
          bankAccounts: [
            {
              id: "acc_101",
              accountNumber: "2019482910",
              accountName: "Illias Olanrewaju",
              bankName: "BankSpace MFB",
              balance: 0.0,
              status: "ACTIVE",
              isPrimary: true,
            },
          ],
        },
        {
          id: "usr_992",
          name: "Michael Okon",
          email: "m.okon@kudabank.com",
          role: "USER",
          isVerified: true,
          phone: "+234 809 112 2334",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          bankAccounts: [
            {
              id: "acc_102",
              accountNumber: "2019482911",
              accountName: "Michael Okon",
              bankName: "Kuda Bank",
              balance: 0.0,
              status: "ACTIVE",
              isPrimary: true,
            },
          ],
        },
      ]
    }

    return NextResponse.json({ users })
  } catch (err) {
    return apiInternalError(err)
  }
}

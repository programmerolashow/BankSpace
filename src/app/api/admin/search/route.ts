/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim() || ""

    if (!query || query.length < 2) {
      return NextResponse.json({
        query,
        results: {
          users: [],
          accounts: [],
          transactions: [],
          transfers: [],
          auditLogs: [],
        },
      })
    }

    const { client } = getPrismaClient()

    // Execute Parallel Multi-Entity Search Queries (capped at top 5 matches per category)
    const [usersList, accountsList, txList, trfList, auditList] = await Promise.all([
      // 1. Users Search (Name, Email, ID)
      client.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { id: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          isSuspended: true,
          kycStatus: true,
          createdAt: true,
        },
        take: 5,
      }),

      // 2. Bank Accounts Search (Account Number, Account Name, Bank Name)
      client.bankAccount
        ? client.bankAccount.findMany({
            where: {
              OR: [
                { accountNumber: { contains: query, mode: "insensitive" } },
                { accountName: { contains: query, mode: "insensitive" } },
                { bankName: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              userId: true,
              accountNumber: true,
              accountName: true,
              bankName: true,
              balance: true,
              currency: true,
              status: true,
              user: {
                select: { name: true, email: true },
              },
            },
            take: 5,
          })
        : Promise.resolve([]),

      // 3. Transactions Search (Reference, Paystack Provider Ref, Description)
      client.transaction.findMany({
        where: {
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { providerRef: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { senderName: { contains: query, mode: "insensitive" } },
            { recipientName: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          reference: true,
          providerRef: true,
          type: true,
          amount: true,
          currency: true,
          status: true,
          senderName: true,
          recipientName: true,
          createdAt: true,
        },
        take: 5,
      }),

      // 4. Transfers Search (Reference, Paystack Code, Recipient NUBAN)
      client.transaction.findMany({
        where: {
          type: "TRANSFER",
          OR: [
            { reference: { contains: query, mode: "insensitive" } },
            { providerRef: { contains: query, mode: "insensitive" } },
            { recipientName: { contains: query, mode: "insensitive" } },
            { accountNumber: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          reference: true,
          providerRef: true,
          amount: true,
          status: true,
          senderName: true,
          recipientName: true,
          accountNumber: true,
          bankName: true,
          createdAt: true,
        },
        take: 5,
      }),

      // 5. Audit Logs Search (Action, Admin Email, Target ID)
      client.auditLog
        ? client.auditLog.findMany({
            where: {
              OR: [
                { action: { contains: query, mode: "insensitive" } },
                { adminEmail: { contains: query, mode: "insensitive" } },
                { adminName: { contains: query, mode: "insensitive" } },
                { targetId: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              action: true,
              adminEmail: true,
              adminName: true,
              targetEntity: true,
              targetId: true,
              ipAddress: true,
              createdAt: true,
            },
            take: 5,
          })
        : Promise.resolve([]),
    ])

    // Format & Map Result Cards with Navigation Links
    const results = {
      users: usersList.map((u: any) => ({
        id: u.id,
        title: u.name,
        subtitle: u.email,
        badge: u.isSuspended ? "SUSPENDED" : u.kycStatus || "USER",
        badgeColor: u.isSuspended ? "rose" : u.isVerified ? "emerald" : "amber",
        entity: "User",
        link: `/admin/users/${u.id}`,
      })),
      accounts: accountsList.map((a: any) => ({
        id: a.id,
        title: `NUBAN: ${a.accountNumber}`,
        subtitle: `${a.accountName} (${a.bankName || "BankSpace"})`,
        badge: `₦${Number(a.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        badgeColor: "amber",
        entity: "BankAccount",
        link: `/admin/users/${a.userId}`,
      })),
      transactions: txList.map((t: any) => ({
        id: t.id,
        title: `Ref: ${t.reference}`,
        subtitle: `${t.type} • ${t.senderName} ➔ ${t.recipientName || "Wallet"}`,
        badge: `₦${Number(t.amount).toLocaleString()} (${t.status})`,
        badgeColor: t.status === "SUCCESSFUL" ? "emerald" : "rose",
        entity: "Transaction",
        link: `/admin/transactions?search=${encodeURIComponent(t.reference)}`,
      })),
      transfers: trfList.map((tr: any) => ({
        id: tr.id,
        title: `Transfer Ref: ${tr.reference}`,
        subtitle: `To: ${tr.recipientName} (${tr.accountNumber})`,
        badge: `₦${Number(tr.amount).toLocaleString()} (${tr.status})`,
        badgeColor: tr.status === "SUCCESSFUL" ? "emerald" : "rose",
        entity: "Transfer",
        link: `/admin/transfers?search=${encodeURIComponent(tr.reference)}`,
      })),
      auditLogs: auditList.map((l: any) => ({
        id: l.id,
        title: `Action: ${l.action}`,
        subtitle: `Admin: ${l.adminEmail || "System"} • Target: ${l.targetEntity} (${l.targetId || "N/A"})`,
        badge: new Date(l.createdAt).toLocaleDateString(),
        badgeColor: "indigo",
        entity: "AuditLog",
        link: `/admin/activity?search=${encodeURIComponent(l.action)}`,
      })),
    }

    const totalCount =
      results.users.length +
      results.accounts.length +
      results.transactions.length +
      results.transfers.length +
      results.auditLogs.length

    return NextResponse.json({
      success: true,
      query,
      totalCount,
      results,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

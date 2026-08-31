/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "../prisma"

export async function fetchPaginatedAdminUsersRepo(
  skip: number,
  limit: number,
  where: any,
  orderBy: any
) {
  const { client } = getPrismaClient()
  return await Promise.all([
    client.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
        bankAccounts: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            balance: true,
            status: true,
            isPrimary: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    client.user.count({ where }),
    client.user.count({ where: { isSuspended: true } }),
    client.user.count({ where: { isVerified: true } }),
  ])
}

export async function fetchPaginatedAdminTransactionsRepo(
  skip: number,
  limit: number,
  where: any,
  orderBy: any
) {
  const { client } = getPrismaClient()
  return await Promise.all([
    client.transaction.findMany({
      where,
      select: {
        id: true,
        reference: true,
        providerRef: true,
        type: true,
        amount: true,
        fee: true,
        status: true,
        senderName: true,
        recipientName: true,
        accountNumber: true,
        createdAt: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    client.transaction.count({ where }),
    client.transaction.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCESSFUL" },
    }),
    client.transaction.count({ where: { status: "SUCCESSFUL" } }),
    client.transaction.count({ where: { status: "PENDING" } }),
    client.transaction.count({ where: { status: "FAILED" } }),
  ])
}

export async function fetchPaginatedAdminTransfersRepo(
  skip: number,
  limit: number,
  where: any,
  orderBy: any
) {
  const { client } = getPrismaClient()
  return await Promise.all([
    client.transaction.findMany({
      where,
      select: {
        id: true,
        reference: true,
        providerRef: true,
        senderName: true,
        recipientName: true,
        accountNumber: true,
        bankName: true,
        amount: true,
        fee: true,
        status: true,
        description: true,
        createdAt: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    client.transaction.count({ where }),
    client.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "TRANSFER", status: "SUCCESSFUL" },
    }),
    client.transaction.count({ where: { type: "TRANSFER", status: "SUCCESSFUL" } }),
    client.transaction.count({ where: { type: "TRANSFER", status: "PENDING" } }),
    client.transaction.count({
      where: { type: "TRANSFER", OR: [{ status: "FAILED" }, { status: "REVERSED" }] },
    }),
  ])
}

export async function fetchPaginatedAuditLogsRepo(
  skip: number,
  limit: number,
  where: any
) {
  const { client } = getPrismaClient()
  if (!client.auditLog) {
    return [[], 0, 0, 0, 0]
  }

  return await Promise.all([
    client.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    client.auditLog.count({ where }),
    client.auditLog.count({ where: { action: "ADMIN_LOGIN" } }),
    client.auditLog.count({ where: { OR: [{ action: "KYC_APPROVE" }, { action: "KYC_REJECT" }] } }),
    client.auditLog.count({ where: { OR: [{ action: "USER_SUSPEND" }, { action: "USER_RESTORE" }] } }),
  ])
}

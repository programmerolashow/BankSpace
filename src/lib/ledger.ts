/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "./prisma"

export type CreateLedgerEntryInput = {
  transactionId: string
  bankAccountId: string
  entryType: "DEBIT" | "CREDIT"
  amount: number
  balanceAfter: number
}

export async function createLedgerEntries(entries: CreateLedgerEntryInput[], prismaInstance?: any) {
  const prisma = prismaInstance || getPrismaClient().client

  if (!prisma.ledgerEntry || typeof prisma.ledgerEntry.create !== "function") {
    return
  }

  for (const entry of entries) {
    try {
      await prisma.ledgerEntry.create({
        data: {
          transactionId: entry.transactionId,
          bankAccountId: entry.bankAccountId,
          entryType: entry.entryType,
          amount: entry.amount,
          balanceAfter: entry.balanceAfter,
        },
      })
    } catch (err) {
      console.warn("[Ledger Entry Notice]:", err)
    }
  }
}

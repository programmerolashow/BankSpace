/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "./prisma"

export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_ACTIVATED"
  | "TRANSACTION_CREATED"
  | "TRANSACTION_SUCCESS"
  | "TRANSACTION_FAILED"
  | "WALLET_DEBIT"
  | "WALLET_CREDIT"
  | "WEBHOOK_VERIFIED"

export async function logAuditEvent(
  userId: string,
  event: AuditEventType,
  details: string,
  ipAddress?: string,
  prismaInstance?: any
) {
  const prisma = prismaInstance || getPrismaClient().client

  try {
    if (prisma.notification && typeof prisma.notification.create === "function") {
      // Record event as notification or audit log
      await prisma.notification.create({
        data: {
          userId,
          title: `Audit Event: ${event}`,
          message: `${details}${ipAddress ? ` (IP: ${ipAddress})` : ""}`,
          type: event.includes("FAILED") || event.includes("SUSPENDED") ? "WARNING" : "INFO",
        },
      }).catch(() => null)
    }
  } catch (err) {
    console.warn("[Audit Log Notice]:", err)
  }
}

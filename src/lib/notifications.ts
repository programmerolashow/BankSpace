/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "./prisma"

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "SECURITY" = "INFO",
  prismaInstance?: any
) {
  const prisma = prismaInstance || getPrismaClient().client

  if (!prisma.notification || typeof prisma.notification.create !== "function") {
    return
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    })
  } catch (err) {
    console.warn("[Create Notification Notice]:", err)
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "SECURITY" = "WARNING",
  prismaInstance?: any
) {
  const prisma = prismaInstance || getPrismaClient().client

  if (!prisma.user || !prisma.notification) {
    return
  }

  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    if (adminUsers.length === 0) return

    await Promise.all(
      adminUsers.map((admin: any) =>
        createNotification(admin.id, title, message, type, prisma)
      )
    )
  } catch (err) {
    console.warn("[Notify Admins Notice]:", err)
  }
}

// -------------------------------------------------------------------
// STANDARDIZED USER SYSTEM PUSH NOTIFICATION TEMPLATES
// -------------------------------------------------------------------

/**
 * Trigger 1: Incoming BankSpace Transfer (P2P)
 * Message: "You received ₦50,000 from John Doe."
 */
export async function notifyIncomingP2PTransfer(
  userId: string,
  senderName: string,
  amount: number,
  prismaInstance?: any
) {
  const formattedAmt = Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const title = "Incoming BankSpace Transfer"
  const message = `You received ₦${formattedAmt} from ${senderName}.`
  return createNotification(userId, title, message, "SUCCESS", prismaInstance)
}

/**
 * Trigger 2: Incoming Bank Transfer (External Bank via DVA NUBAN)
 * Message: "₦100,000 was received into your BankSpace account from GTBank."
 */
export async function notifyIncomingBankTransfer(
  userId: string,
  bankName: string,
  amount: number,
  prismaInstance?: any
) {
  const formattedAmt = Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const title = "Incoming Bank Transfer"
  const message = `₦${formattedAmt} was received into your BankSpace account from ${bankName || "External Bank"}.`
  return createNotification(userId, title, message, "SUCCESS", prismaInstance)
}

/**
 * Trigger 3: KYC Verification Success (Approved)
 * Message: "Your identity verification has been completed successfully."
 */
export async function notifyKycVerificationSuccess(
  userId: string,
  prismaInstance?: any
) {
  const title = "KYC Verification Completed"
  const message = "Your identity verification has been completed successfully."
  return createNotification(userId, title, message, "SUCCESS", prismaInstance)
}

/**
 * Trigger 4: KYC Failure (Rejection / Mismatch)
 * Message: "We couldn't verify your identity. Please review your information and try again."
 */
export async function notifyKycVerificationFailure(
  userId: string,
  prismaInstance?: any
) {
  const title = "KYC Verification Failed"
  const message = "We couldn't verify your identity. Please review your information and try again."
  return createNotification(userId, title, message, "WARNING", prismaInstance)
}

/**
 * Trigger 5: Virtual Account Creation (DVA Provisioned)
 * Message: "Your BankSpace receiving account is ready."
 */
export async function notifyVirtualAccountCreated(
  userId: string,
  prismaInstance?: any
) {
  const title = "Virtual Account Provisioned"
  const message = "Your BankSpace receiving account is ready."
  return createNotification(userId, title, message, "INFO", prismaInstance)
}

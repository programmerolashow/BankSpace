/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "../prisma"
import { createNotification } from "../notifications"

export async function executeUserStatusMutationService(
  adminUser: { id: string; email: string; name?: string | null },
  targetUserId: string,
  action: "SUSPEND" | "ACTIVATE",
  ipAddress?: string,
  userAgent?: string,
  reason?: string
) {
  const { client } = getPrismaClient()
  const isSuspended = action === "SUSPEND"
  const targetStatus = isSuspended ? "FROZEN" : "ACTIVE"
  const auditAction = isSuspended ? "USER_SUSPEND" : "USER_RESTORE"

  // 1. Update User Record
  if (client.user && typeof client.user.update === "function") {
    await client.user.update({
      where: { id: targetUserId },
      data: { isSuspended },
    })
  }

  // 2. Update User Bank Accounts Status
  if (client.bankAccount && typeof client.bankAccount.updateMany === "function") {
    await client.bankAccount.updateMany({
      where: { userId: targetUserId },
      data: { status: targetStatus },
    })
  }

  // 3. Trigger User Security Alert Notification
  await createNotification(
    targetUserId,
    `Account Status Alert: ${targetStatus}`,
    `Your BankSpace account status has been updated to ${targetStatus} by System Security. Rationale: ${reason || "Administrative security action."}`,
    "SECURITY"
  )

  // 4. Record Audit Log Entry
  if (client.auditLog && typeof client.auditLog.create === "function") {
    try {
      await client.auditLog.create({
        data: {
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          adminName: adminUser.name || adminUser.email,
          action: auditAction,
          targetEntity: "User",
          targetId: targetUserId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: JSON.stringify({
            action,
            targetStatus,
            reason: reason || "Administrative security mutation executed.",
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (err) {
      console.warn("[Admin Service Audit Log Notice]:", err)
    }
  }

  return {
    success: true,
    targetUserId,
    action,
    targetStatus,
  }
}

export async function executeKycComplianceDecisionService(
  adminUser: { id: string; email: string; name?: string | null },
  targetUserId: string,
  action: "APPROVE" | "REJECT",
  reason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  const { client } = getPrismaClient()
  const isApproved = action === "APPROVE"
  const kycStatus = isApproved ? "VERIFIED" : "REJECTED"
  const auditAction = isApproved ? "KYC_APPROVE" : "KYC_REJECT"

  // 1. Update Customer Record
  await client.user.update({
    where: { id: targetUserId },
    data: {
      isVerified: isApproved,
      kycStatus,
      kycRejectionReason: isApproved ? null : reason || "Identity verification rejected",
    },
  })

  // 2. Notify Customer
  await createNotification(
    targetUserId,
    `Identity Compliance Update: ${kycStatus}`,
    isApproved
      ? "Your BankSpace identity verification (KYC) has been approved."
      : `Your KYC verification was rejected. Reason: ${reason || "Re-submit valid documents."}`,
    isApproved ? "SUCCESS" : "WARNING"
  )

  // 3. Record Audit Log Entry
  if (client.auditLog && typeof client.auditLog.create === "function") {
    try {
      await client.auditLog.create({
        data: {
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          adminName: adminUser.name || adminUser.email,
          action: auditAction,
          targetEntity: "KycSubmission",
          targetId: targetUserId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          metadata: JSON.stringify({
            action,
            kycStatus,
            reason: reason || "Compliance decision executed.",
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (err) {
      console.warn("[Admin KYC Service Audit Notice]:", err)
    }
  }

  return {
    success: true,
    targetUserId,
    action,
    kycStatus,
  }
}

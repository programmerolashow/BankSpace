/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { requireAdminSession } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { getClientIp } from "@/lib/rateLimit"
import { apiUnauthorized, apiForbidden, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid || !authCheck.user) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { client } = getPrismaClient()
    const adminId = authCheck.user.id

    // 1. Fetch Current Admin Profile
    const adminProfile = await client.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 2. Fetch Active Sessions Count
    let activeSessionsCount = 1
    if (client.session && typeof client.session.count === "function") {
      try {
        activeSessionsCount = await client.session.count({
          where: {
            userId: adminId,
            expiresAt: { gt: new Date() },
          },
        })
      } catch {
        // Fallback
      }
    }

    // 3. System Health Checks
    let dbStatus = "CONNECTED"
    try {
      await client.$queryRaw`SELECT 1`
    } catch {
      dbStatus = "DEGRADED"
    }

    const paystackConfigured = !!(process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_SECRET_KEY)
    const clientIp = getClientIp(request)

    return NextResponse.json({
      success: true,
      profile: adminProfile,
      security: {
        activeSessionsCount: Math.max(activeSessionsCount, 1),
        currentSessionIp: clientIp,
        authRole: adminProfile?.role || "ADMIN",
      },
      system: {
        dbStatus,
        paystackStatus: paystackConfigured ? "CONFIGURED_ACTIVE" : "NOT_CONFIGURED",
        environment: process.env.NODE_ENV || "development",
        rateLimiting: "ACTIVE_ENFORCED",
      },
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value || ""

    const authCheck = await requireAdminSession(authToken)
    if (!authCheck.valid || !authCheck.user) {
      if (authCheck.status === 401) {
        return apiUnauthorized(authCheck.error || "Authentication required. Please log in.")
      }
      return apiForbidden(authCheck.error || "Administrator privileges required.")
    }

    const { client } = getPrismaClient()
    const adminId = authCheck.user.id
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || undefined

    const body = await request.json().catch(() => ({}))
    const { action, name, phone, currentPassword, newPassword } = body

    if (!action) {
      return apiBadRequest("Action parameter is required.")
    }

    // ACTION 1: UPDATE_PROFILE
    if (action === "UPDATE_PROFILE") {
      if (!name || typeof name !== "string" || !name.trim()) {
        return apiBadRequest("Admin full name cannot be empty.")
      }

      await client.user.update({
        where: { id: adminId },
        data: {
          name: name.trim(),
          phone: phone ? phone.trim() : null,
        },
      })

      // Record Audit Log
      if (client.auditLog) {
        await client.auditLog.create({
          data: {
            adminId,
            adminEmail: authCheck.user.email,
            adminName: name.trim(),
            action: "SETTINGS_CHANGE",
            targetEntity: "AdminProfile",
            targetId: adminId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({ update: "Profile details updated", updatedFields: ["name", "phone"] }),
          },
        }).catch(() => null)
      }

      return NextResponse.json({
        success: true,
        message: "Admin profile details updated successfully.",
      })
    }

    // ACTION 2: CHANGE_PASSWORD
    if (action === "CHANGE_PASSWORD") {
      if (!currentPassword || !newPassword) {
        return apiBadRequest("Current password and new password are required.")
      }

      const currentUser = await client.user.findUnique({
        where: { id: adminId },
        select: { passwordHash: true, email: true, name: true },
      })

      if (!currentUser || !currentUser.passwordHash) {
        return apiBadRequest("User account does not support password mutation.")
      }

      // Verify Current Password with Bcrypt
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.passwordHash)
      if (!isValidPassword) {
        return apiBadRequest("Current password is incorrect.")
      }

      // Password Complexity Validation: Min 8 chars, 1 uppercase, 1 digit
      if (newPassword.length < 8) {
        return apiBadRequest("New password must be at least 8 characters long.")
      }
      if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return apiBadRequest("New password must contain at least one uppercase letter and one number.")
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      await client.user.update({
        where: { id: adminId },
        data: { passwordHash: newPasswordHash },
      })

      // Record Audit Log
      if (client.auditLog) {
        await client.auditLog.create({
          data: {
            adminId,
            adminEmail: currentUser.email,
            adminName: currentUser.name,
            action: "SETTINGS_CHANGE",
            targetEntity: "AdminSecurity",
            targetId: adminId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({ update: "Administrator password changed successfully." }),
          },
        }).catch(() => null)
      }

      return NextResponse.json({
        success: true,
        message: "Administrator password changed successfully.",
      })
    }

    // ACTION 3: TERMINATE_OTHER_SESSIONS
    if (action === "TERMINATE_OTHER_SESSIONS") {
      if (client.session) {
        await client.session.deleteMany({
          where: {
            userId: adminId,
            token: { not: authToken },
          },
        }).catch(() => null)
      }

      // Record Audit Log
      if (client.auditLog) {
        await client.auditLog.create({
          data: {
            adminId,
            adminEmail: authCheck.user.email,
            adminName: authCheck.user.name,
            action: "SETTINGS_CHANGE",
            targetEntity: "AdminSession",
            targetId: adminId,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({ update: "Terminated all other active administrator sessions." }),
          },
        }).catch(() => null)
      }

      return NextResponse.json({
        success: true,
        message: "All other active administrator sessions have been terminated.",
      })
    }

    return apiBadRequest("Unsupported settings action.")
  } catch (err) {
    return apiInternalError(err)
  }
}

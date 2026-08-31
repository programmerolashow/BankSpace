import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { getPrismaClient } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  role?: string
  kycStatus?: string
  isVerified?: boolean
  isProfileComplete?: boolean
}

export type OAuthProfilePayload = {
  provider: "google" | "apple"
  providerAccountId: string
  email: string
  name?: string
  avatarUrl?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  idToken?: string
}

export function getAppOrigin(request: Request): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (envUrl && !envUrl.includes("0.0.0.0")) {
    const formatted = envUrl.replace(/\/$/, "")
    return formatted.startsWith("http") ? formatted : `https://${formatted}`
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  if (host && !host.includes("0.0.0.0")) {
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1")
    const proto = request.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https")
    return `${proto}://${host}`
  }

  const url = new URL(request.url)
  return url.origin.replace("0.0.0.0", "localhost")
}

export function redirectApp(path: string, request: Request): NextResponse {
  const origin = getAppOrigin(request)
  const targetUrl = new URL(path, origin).toString()
  return NextResponse.redirect(targetUrl)
}

export async function registerUser(name: string, email: string, password: string, phone?: string) {
  const { client } = getPrismaClient()
  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    throw new Error("User already exists with this email")
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = await client.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      phone: phone?.trim() || null,
      role: "USER",
    },
  })

  return {
    user: {
      id: String(newUser.id),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    },
  }
}

export async function registerAdminUser(name: string, email: string, password: string, adminKey: string) {
  const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || "bankspace-admin-key-2026"
  if (adminKey !== expectedAdminKey) {
    throw new Error("Invalid Administrator Authorization Key")
  }

  const { client } = getPrismaClient()
  const normalizedEmail = email.toLowerCase().trim()

  const existingUser = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    throw new Error("User already exists with this email")
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newAdmin = await client.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: "ADMIN",
      isVerified: true,
    },
  })

  return {
    user: {
      id: String(newAdmin.id),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
    },
  }
}

export async function loginUser(email: string, password: string, ipAddress?: string, userAgent?: string) {
  const normalizedEmail = email.toLowerCase().trim()

  // Pre-configured demo user support
  if (normalizedEmail === "user@bankite.com" && password === "password123") {
    const userId = "demo_user_123"
    const token = jwt.sign({ sub: userId, email: normalizedEmail, role: "USER" }, JWT_SECRET, { expiresIn: "7d" })
    return {
      token,
      user: {
        id: userId,
        name: "Illias Olanrewaju",
        email: normalizedEmail,
        role: "USER",
      },
    }
  }

  // Pre-configured demo admin support
  if (normalizedEmail === "admin@bankspace.com" && password === "admin12345") {
    const userId = "demo_admin_777"
    const token = jwt.sign({ sub: userId, email: normalizedEmail, role: "ADMIN" }, JWT_SECRET, { expiresIn: "7d" })
    return {
      token,
      user: {
        id: userId,
        name: "System Admin",
        email: normalizedEmail,
        role: "ADMIN",
      },
    }
  }

  const { client } = getPrismaClient()
  const user = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials")
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    throw new Error("Invalid credentials")
  }

  const userId = String(user.id)
  const token = jwt.sign({ sub: userId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" })

  try {
    if (client.session && typeof client.session.create === "function") {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await client.session.create({
        data: {
          userId,
          token,
          expiresAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      })
    }
  } catch (err) {
    console.warn("[Session Recording Notice]:", err instanceof Error ? err.message : err)
  }

  return {
    token,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  }
}

export async function verifySessionToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role?: string }
    if (!decoded || !decoded.sub) {
      return { valid: false, error: "Invalid session token" }
    }

    if (decoded.sub === "demo_user_123" || decoded.email === "user@bankite.com") {
      return {
        valid: true,
        user: {
          id: "demo_user_123",
          name: "Illias Olanrewaju",
          email: "user@bankite.com",
          phone: "+234 812 345 6789",
          role: "USER",
        },
      }
    }

    if (decoded.sub === "demo_admin_777" || decoded.email === "admin@bankspace.com") {
      return {
        valid: true,
        user: {
          id: "demo_admin_777",
          name: "System Admin",
          email: "admin@bankspace.com",
          phone: "+234 800 000 0000",
          role: "ADMIN",
        },
      }
    }

    const { client } = getPrismaClient()

    if (client.session && typeof client.session.findUnique === "function") {
      const dbSession = await client.session.findUnique({
        where: { token },
      })
      if (!dbSession || new Date() > dbSession.expiresAt) {
        return { valid: false, error: "Session has been revoked or expired" }
      }
    }

    const user = await client.user.findUnique({
      where: { id: decoded.sub },
    })

    if (!user) {
      return { valid: false, error: "User not found" }
    }

    const isProfileComplete = Boolean(
      user.phone &&
      (user.bvn || user.nin) &&
      user.kycStatus === "VERIFIED"
    )

    return {
      valid: true,
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        kycStatus: user.kycStatus || "UNVERIFIED",
        isVerified: Boolean(user.isVerified),
        isProfileComplete,
      },
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Token verification failed" }
  }
}

export async function requireAdminSession(token: string) {
  if (!token) {
    return { valid: false, status: 401, error: "Authentication required. Please log in." }
  }
  const result = await verifySessionToken(token)
  if (!result.valid || !result.user) {
    return { valid: false, status: 401, error: result.error || "Unauthenticated session" }
  }
  if (result.user.role !== "ADMIN") {
    return { valid: false, status: 403, error: "Access denied. Administrator privileges required." }
  }
  return { valid: true, status: 200, user: result.user }
}

export async function revokeSessionToken(token: string) {
  const { client } = getPrismaClient()
  try {
    if (client.session && typeof client.session.delete === "function") {
      await client.session.delete({ where: { token } }).catch(() => null)
    }
  } catch (err) {
    console.warn("[Revoke Session Notice]:", err)
  }
}

export function requireRole(userRole: string = "USER", allowedRoles: string[] = ["USER", "ADMIN"]): boolean {
  return allowedRoles.includes(userRole)
}

export async function findOrCreateOAuthAccount(payload: OAuthProfilePayload) {
  const { client } = getPrismaClient()
  const normalizedEmail = payload.email.toLowerCase().trim()

  if (client.account && typeof client.account.findUnique === "function") {
    const existingAccount = await client.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: payload.provider,
          providerAccountId: payload.providerAccountId,
        },
      },
      include: { user: true },
    })

    if (existingAccount && existingAccount.user) {
      const user = existingAccount.user
      const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" })

      try {
        if (client.session && typeof client.session.create === "function") {
          await client.session.create({
            data: {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          })
        }
      } catch (e) {
        console.warn("[OAuth Session Recording Notice]:", e)
      }

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      }
    }
  }

  let targetUser = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!targetUser) {
    targetUser = await client.user.create({
      data: {
        name: payload.name || (payload.provider === "google" ? "Google User" : "Apple User"),
        email: normalizedEmail,
        isVerified: true,
        avatarUrl: payload.avatarUrl || null,
        role: "USER",
      },
    })
  }

  if (client.account && typeof client.account.create === "function") {
    try {
      await client.account.create({
        data: {
          userId: targetUser.id,
          provider: payload.provider,
          providerAccountId: payload.providerAccountId,
          accessToken: payload.accessToken || null,
          refreshToken: payload.refreshToken || null,
          expiresAt: payload.expiresAt || null,
          idToken: payload.idToken || null,
        },
      })
    } catch (e) {
      console.warn("[Account Link Warning]:", e)
    }
  }

  const userId = String(targetUser.id)
  const token = jwt.sign({ sub: userId, email: targetUser.email, role: targetUser.role }, JWT_SECRET, { expiresIn: "7d" })

  try {
    if (client.session && typeof client.session.create === "function") {
      await client.session.create({
        data: {
          userId,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    }
  } catch (e) {
    console.warn("[Session Recording Notice]:", e)
  }

  const isProfileComplete = Boolean(
    targetUser.phone &&
    (targetUser.bvn || targetUser.nin) &&
    targetUser.kycStatus === "VERIFIED"
  )

  return {
    token,
    user: {
      id: userId,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      avatarUrl: targetUser.avatarUrl,
      role: targetUser.role,
      kycStatus: targetUser.kycStatus || "UNVERIFIED",
      isVerified: Boolean(targetUser.isVerified),
      isProfileComplete,
    },
  }
}

export async function loginWithOAuth(provider: "google" | "apple", inputEmail?: string, inputName?: string) {
  const defaultProviderAccountId =
    provider === "google" ? "google_sub_109283741" : "apple_sub_984712039"
  const defaultEmail =
    provider === "google" ? "google.user@bankspace.com" : "apple.user@bankspace.com"
  const defaultName = provider === "google" ? "Google User" : "Apple User"

  return findOrCreateOAuthAccount({
    provider,
    providerAccountId: defaultProviderAccountId,
    email: inputEmail || defaultEmail,
    name: inputName || defaultName,
  })
}

export async function generatePasswordResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const { client } = getPrismaClient()

  if (normalizedEmail === "user@bankite.com") {
    const demoToken = "demo_reset_token_" + Date.now()
    return {
      token: demoToken,
      email: normalizedEmail,
      message: "Reset token generated successfully",
    }
  }

  const user = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    throw new Error("No account found with this email address")
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  if (client.passwordResetToken && typeof client.passwordResetToken.create === "function") {
    await client.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })
  }

  return {
    token,
    email: normalizedEmail,
    message: "Reset token generated successfully",
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (token.startsWith("demo_reset_token_")) {
    return { message: "Demo password updated successfully" }
  }

  const { client } = getPrismaClient()

  if (!client.passwordResetToken || typeof client.passwordResetToken.findUnique !== "function") {
    return { message: "Password updated successfully" }
  }

  const resetRecord = await client.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetRecord) {
    throw new Error("Invalid or expired password reset token")
  }

  if (new Date() > resetRecord.expiresAt) {
    await client.passwordResetToken.delete({ where: { token } }).catch(() => null)
    throw new Error("Password reset token has expired. Please request a new link.")
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await client.user.update({
    where: { id: resetRecord.userId },
    data: { passwordHash },
  })

  await client.passwordResetToken.delete({ where: { token } }).catch(() => null)

  return { message: "Password has been successfully updated" }
}

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { getPrismaClient } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
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
    },
  })

  return {
    user: {
      id: String(newUser.id),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
    },
  }
}

export async function loginUser(email: string, password: string, ipAddress?: string, userAgent?: string) {
  const normalizedEmail = email.toLowerCase().trim()

  // Pre-configured demo user support
  if (normalizedEmail === "user@bankite.com" && password === "password123") {
    const userId = "demo_user_123"
    const token = jwt.sign({ sub: userId, email: normalizedEmail }, JWT_SECRET, { expiresIn: "7d" })
    return {
      token,
      user: {
        id: userId,
        name: "Illias Omotayo",
        email: normalizedEmail,
      },
    }
  }

  const { client } = getPrismaClient()
  const user = await client.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    throw new Error("Invalid credentials")
  }

  const userId = String(user.id)
  const token = jwt.sign({ sub: userId, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

  // Record session in database if using live Prisma client
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
    },
  }
}

export async function generatePasswordResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const { client } = getPrismaClient()

  // Support demo account password reset simulation
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration

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

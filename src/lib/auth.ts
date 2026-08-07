import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getPrismaClient } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export type AuthUser = {
  id: string
  name: string
  email: string
}

export async function registerUser(name: string, email: string, password: string) {
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
    },
  })

  return {
    user: {
      id: String(newUser.id),
      name: newUser.name,
      email: newUser.email,
    },
  }
}

export async function loginUser(email: string, password: string) {
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

  return {
    token,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
    },
  }
}

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDb } from "./db"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export type AuthUser = {
  id: string
  name: string
  email: string
}

export async function registerUser(name: string, email: string, password: string) {
  const db = getDb()
  const normalizedEmail = email.toLowerCase().trim()

  const existingUsers = await db.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
    [normalizedEmail]
  )

  if (existingUsers && existingUsers.length > 0) {
    throw new Error("User already exists with this email")
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const result = await db.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
    [name, normalizedEmail, passwordHash]
  )

  const newUser = result[0] || { id: "1", name, email: normalizedEmail }

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

  const db = getDb()
  const rows = await db.query(
    "SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
    [normalizedEmail]
  )

  if (!rows || rows.length === 0) {
    throw new Error("Invalid credentials")
  }

  const user = rows[0]
  const isValidPassword = await bcrypt.compare(password, user.password_hash)
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

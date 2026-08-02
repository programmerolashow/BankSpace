import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { connectToDatabase } from "./mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export type AuthUser = {
  id: string
  name: string
  email: string
}

export async function registerUser(name: string, email: string, password: string) {
  const { db } = await connectToDatabase()
  const users = db.collection<{ name: string; email: string; passwordHash: string; createdAt: Date }>("users")

  const existingUser = await users.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw new Error("User already exists")
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const result = await users.insertOne({
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date(),
  })

  return {
    user: {
      id: result.insertedId.toString(),
      name,
      email: email.toLowerCase(),
    },
  }
}

export async function loginUser(email: string, password: string) {
  const { db } = await connectToDatabase()
  const users = db.collection<{ _id: unknown; name: string; email: string; passwordHash: string }>("users")

  const user = await users.findOne({ email: email.toLowerCase() })
  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    throw new Error("Invalid credentials")
  }

  const userId = String(user._id)
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

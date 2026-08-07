import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { getPrismaClient } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "bankite-dev-secret"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    // Verify JWT token
    const decoded = jwt.verify(authToken, JWT_SECRET) as { sub: string; email: string }

    if (!decoded || !decoded.sub) {
      return NextResponse.json({ message: "Invalid session token" }, { status: 401 })
    }

    // Demo account fallback
    if (decoded.sub === "demo_user_123" || decoded.email === "user@bankite.com") {
      return NextResponse.json({
        user: {
          id: "demo_user_123",
          name: "Illias Omotayo",
          email: "user@bankite.com",
          phone: "+234 812 345 6789",
        },
      })
    }

    const { client } = getPrismaClient()
    const user = await client.user.findUnique({
      where: { id: decoded.sub },
    })

    if (!user) {
      // Fallback search by email
      const userByEmail = await client.user.findUnique({
        where: { email: decoded.email },
      })

      if (userByEmail) {
        return NextResponse.json({
          user: {
            id: String(userByEmail.id),
            name: userByEmail.name,
            email: userByEmail.email,
            phone: userByEmail.phone,
          },
        })
      }

      return NextResponse.json({
        user: {
          id: decoded.sub,
          name: "BankSpace User",
          email: decoded.email,
        },
      })
    }

    return NextResponse.json({
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Authentication error" },
      { status: 401 }
    )
  }
}

import { NextResponse } from "next/server"
import { registerUser, loginUser } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"
import { apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`register_${ip}`, 5, 15 * 60 * 1000)

    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many registration attempts. Please try again in 15 minutes." },
        { status: 429 }
      )
    }

    const { name, email, password, phone } = await request.json()

    if (!name || !email || !password) {
      return apiBadRequest("Missing required fields (name, email, password)")
    }

    const sanitizedEmail = String(email).trim().toLowerCase()
    const sanitizedName = String(name).trim()

    if (sanitizedName.length < 2) {
      return apiBadRequest("Name must be at least 2 characters long")
    }

    if (password.length < 8) {
      return apiBadRequest("Password must be at least 8 characters long for account security")
    }

    const result = await registerUser(sanitizedName, sanitizedEmail, password, phone)
    const loginResult = await loginUser(sanitizedEmail, password, ip)

    const response = NextResponse.json({ user: result.user }, { status: 201 })

    response.cookies.set("auth", loginResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed"
    if (message.includes("User already exists")) {
      return apiBadRequest("An account already exists with this email address")
    }
    return apiInternalError(error)
  }
}

import { NextResponse } from "next/server"
import { registerAdminUser, loginUser } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"
import { apiBadRequest, apiInternalError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`admin_register_${ip}`, 5, 15 * 60 * 1000)

    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many admin registration attempts. Please try again in 15 minutes." },
        { status: 429 }
      )
    }

    const { name, email, password, adminKey } = await request.json()

    if (!name || !email || !password || !adminKey) {
      return apiBadRequest("Missing required fields (name, email, password, adminKey)")
    }

    if (password.length < 8) {
      return apiBadRequest("Password must be at least 8 characters long")
    }

    const result = await registerAdminUser(name, email, password, adminKey)
    const loginResult = await loginUser(email, password, ip)

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
    const message = error instanceof Error ? error.message : "Admin registration failed"
    if (message.includes("Invalid Administrator Authorization Key") || message.includes("already exists")) {
      return apiBadRequest(message)
    }
    return apiInternalError(error)
  }
}

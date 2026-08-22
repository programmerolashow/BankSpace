import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`login_${ip}`, 5, 15 * 60 * 1000)

    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many login attempts. Please try again in 15 minutes." },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    const userAgent = request.headers.get("user-agent") || undefined
    const { token, user } = await loginUser(email, password, ip, userAgent)

    const response = NextResponse.json({ user, token }, { status: 200 })

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ message }, { status: 401 })
  }
}

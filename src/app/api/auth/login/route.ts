import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const result = await loginUser(email, password)
    const response = NextResponse.json({ user: result.user }, { status: 200 })

    response.cookies.set("auth", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ message }, { status: 401 })
  }
}

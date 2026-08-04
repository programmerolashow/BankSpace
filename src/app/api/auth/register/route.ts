import { NextResponse } from "next/server"
import { registerUser, loginUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const result = await registerUser(name, email, password)
    const loginResult = await loginUser(email, password)

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
    return NextResponse.json({ message }, { status: 400 })
  }
}

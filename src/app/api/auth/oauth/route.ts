import { NextResponse } from "next/server"
import { loginWithOAuth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { provider, email, name } = await request.json()

    if (provider !== "google" && provider !== "apple") {
      return NextResponse.json({ message: "Invalid OAuth provider specified" }, { status: 400 })
    }

    const { token, user } = await loginWithOAuth(provider, email, name)

    const response = NextResponse.json({ user, token }, { status: 200 })

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth authentication failed"
    return NextResponse.json({ message }, { status: 400 })
  }
}

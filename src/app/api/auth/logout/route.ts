import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revokeSessionToken } from "@/lib/auth"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (authToken) {
      await revokeSessionToken(authToken)
    }
  } catch (err) {
    console.warn("[Logout Session Revocation Notice]:", err)
  }

  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set("auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}

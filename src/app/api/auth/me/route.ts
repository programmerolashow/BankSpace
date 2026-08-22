import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const result = await verifySessionToken(authToken)

    if (!result.valid || !result.user) {
      return NextResponse.json(
        { message: result.error || "Invalid or expired session" },
        { status: 401 }
      )
    }

    return NextResponse.json({ user: result.user })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Authentication error" },
      { status: 401 }
    )
  }
}

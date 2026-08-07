import { NextResponse } from "next/server"
import { resetPasswordWithToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters long" }, { status: 400 })
    }

    const result = await resetPasswordWithToken(token, newPassword)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset failed"
    return NextResponse.json({ message }, { status: 400 })
  }
}

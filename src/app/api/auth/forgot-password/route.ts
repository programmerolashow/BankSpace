import { NextResponse } from "next/server"
import { generatePasswordResetToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: "Email address is required" }, { status: 400 })
    }

    const result = await generatePasswordResetToken(email)

    return NextResponse.json(
      {
        message: "Password recovery instructions sent to your email.",
        token: result.token,
        email: result.email,
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process recovery request"
    return NextResponse.json({ message }, { status: 400 })
  }
}

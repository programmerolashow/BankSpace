import { NextResponse } from "next/server"
import { loginWithOAuth } from "@/lib/auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const provider = (url.searchParams.get("provider") as "google" | "apple") || "google"

  try {
    const { token, user } = await loginWithOAuth(provider)

    const response = NextResponse.redirect(new URL("/dashboard", request.url))

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth login failed"
    return NextResponse.redirect(new URL("/?auth=login&error=" + encodeURIComponent(message), request.url))
  }
}

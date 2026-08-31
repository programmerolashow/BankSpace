import { NextResponse } from "next/server"
import { loginWithOAuth, getAppOrigin, redirectApp } from "@/lib/auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const provider = (url.searchParams.get("provider") as "google" | "apple") || "google"
  const origin = getAppOrigin(request)

  try {
    const { token, user } = await loginWithOAuth(provider)

    const targetPath = user?.isProfileComplete ? "/dashboard" : "/complete-profile"
    const redirectTargetUrl = new URL(targetPath, origin).toString()
    const response = NextResponse.redirect(redirectTargetUrl)

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
    return redirectApp("/?auth=login&error=" + encodeURIComponent(message), request)
  }
}

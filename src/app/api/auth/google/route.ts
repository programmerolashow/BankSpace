import { NextResponse } from "next/server"
import crypto from "crypto"
import { getAppOrigin, redirectApp } from "@/lib/auth"

export async function GET(request: Request) {
  const origin = getAppOrigin(request)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes("localhost")
      ? process.env.GOOGLE_REDIRECT_URI
      : `${origin}/api/auth/callback/google`

  // Fallback to simulation endpoint if client ID is missing in dev environment
  if (!clientId || clientId.includes("your-google-client-id")) {
    return redirectApp("/api/auth/oauth-fallback?provider=google", request)
  }

  // Generate cryptographically secure state parameter for CSRF validation
  const state = crypto.randomBytes(32).toString("hex")

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid email profile")
  googleAuthUrl.searchParams.set("state", state)
  googleAuthUrl.searchParams.set("prompt", "select_account")

  const response = NextResponse.redirect(googleAuthUrl.toString())

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}

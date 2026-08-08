import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/callback/google`

  // Fallback to simulation if GOOGLE_CLIENT_ID is unconfigured
  if (!clientId || clientId.includes("your-google-client-id")) {
    const response = NextResponse.redirect(new URL("/api/auth/oauth-fallback?provider=google", request.url))
    return response
  }

  const state = crypto.randomBytes(32).toString("hex")
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid profile email")
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

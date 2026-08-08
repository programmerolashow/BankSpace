import { NextResponse } from "next/server"
import crypto from "crypto"
import { getAppOrigin, redirectApp } from "@/lib/auth"

export async function GET(request: Request) {
  const origin = getAppOrigin(request)
  const clientId = process.env.APPLE_CLIENT_ID
  const redirectUri = process.env.APPLE_REDIRECT_URI || `${origin}/api/auth/callback/apple`

  // Fallback to simulation if APPLE_CLIENT_ID is unconfigured
  if (!clientId || clientId.includes("your-apple-service-id")) {
    return redirectApp("/api/auth/oauth-fallback?provider=apple", request)
  }

  const state = crypto.randomBytes(32).toString("hex")
  const nonce = crypto.randomBytes(32).toString("hex")

  const appleAuthUrl = new URL("https://appleid.apple.com/auth/authorize")
  appleAuthUrl.searchParams.set("client_id", clientId)
  appleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  appleAuthUrl.searchParams.set("response_type", "code id_token")
  appleAuthUrl.searchParams.set("response_mode", "form_post")
  appleAuthUrl.searchParams.set("scope", "name email")
  appleAuthUrl.searchParams.set("state", state)
  appleAuthUrl.searchParams.set("nonce", nonce)

  const response = NextResponse.redirect(appleAuthUrl.toString())
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })
  response.cookies.set("oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })

  return response
}

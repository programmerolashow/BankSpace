import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateOAuthAccount } from "@/lib/auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  // Handle user cancellation or provider error
  if (error) {
    return NextResponse.redirect(new URL("/?auth=login&error=" + encodeURIComponent(error), request.url))
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/?auth=login&error=invalid_state", request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=login&error=missing_code", request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/callback/google`

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to retrieve access token from Google")
    }

    // Fetch Google user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const profile = await profileRes.json()

    if (!profile.sub || !profile.email) {
      throw new Error("Invalid user profile returned from Google")
    }

    // Extract name from Google profile (given_name / name)
    const displayName = profile.name || profile.given_name || "Google User"

    const { token, user } = await findOrCreateOAuthAccount({
      provider: "google",
      providerAccountId: profile.sub,
      email: profile.email,
      name: displayName,
      avatarUrl: profile.picture,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : undefined,
      idToken: tokenData.id_token,
    })

    const response = NextResponse.redirect(new URL("/dashboard", request.url))
    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google OAuth authentication failed"
    return NextResponse.redirect(new URL("/?auth=login&error=" + encodeURIComponent(message), request.url))
  }
}

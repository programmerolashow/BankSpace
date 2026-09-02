import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { findOrCreateOAuthAccount, getAppOrigin, redirectApp } from "@/lib/auth"
import { deriveUserKycState } from "@/lib/kycStateEngine"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  // 1. Handle user cancellation or Google authorization denial
  if (error) {
    const userError = error === "access_denied" ? "Google sign-in was cancelled" : "Google authentication failed"
    return redirectApp("/?auth=login&error=" + encodeURIComponent(userError), request)
  }

  // 2. Validate state parameter for CSRF protection
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value

  if (!state || !savedState || state !== savedState) {
    return redirectApp("/?auth=login&error=Invalid+CSRF+state.+Please+try+logging+in+again", request)
  }

  if (!code) {
    return redirectApp("/?auth=login&error=Missing+authorization+code+from+Google", request)
  }

  const origin = getAppOrigin(request)
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes("localhost")
      ? process.env.GOOGLE_REDIRECT_URI
      : `${origin}/api/auth/callback/google`

  try {
    // 3. Exchange authorization code for Google access & ID tokens
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
      throw new Error(tokenData.error_description || "Failed to exchange authorization code with Google")
    }

    // 4. Retrieve verified Google user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    const profile = await profileRes.json()

    if (!profile.sub || !profile.email) {
      throw new Error("Google user profile did not include email address or provider ID")
    }

    // Determine user display name
    const displayName = profile.name || profile.given_name || "Google User"

    // 5. Look up or create application User and Account in PostgreSQL
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

    // 6. Multi-Stage Onboarding Check: Profile Completeness -> Phone Verification -> KYC Status
    const kycEvaluation = deriveUserKycState(user)
    const isFullyComplete = kycEvaluation.state === "ACTIVE" || kycEvaluation.state === "KYC_VERIFIED"
    const targetPath = isFullyComplete ? "/dashboard" : "/complete-profile"
    const redirectTargetUrl = new URL(targetPath, origin).toString()
    const response = NextResponse.redirect(redirectTargetUrl)

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Clear state cookie
    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" })

    return response
  } catch (err) {
    const safeErrorMessage = err instanceof Error ? err.message : "Google authentication error"
    return redirectApp("/?auth=login&error=" + encodeURIComponent(safeErrorMessage), request)
  }
}

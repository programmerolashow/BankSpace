/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { findOrCreateOAuthAccount, getAppOrigin, redirectApp } from "@/lib/auth"

async function handleAppleCallback(request: Request) {
  const url = new URL(request.url)
  const origin = getAppOrigin(request)
  let code: string | null = null
  let state: string | null = null
  let idTokenStr: string | null = null
  let userPayloadRaw: string | null = null

  if (request.method === "POST") {
    try {
      const formData = await request.formData()
      code = formData.get("code") as string
      state = formData.get("state") as string
      idTokenStr = formData.get("id_token") as string
      userPayloadRaw = formData.get("user") as string
    } catch {
      // Fallback if JSON body
    }
  }

  if (!code) code = url.searchParams.get("code")
  if (!state) state = url.searchParams.get("state")
  if (!idTokenStr) idTokenStr = url.searchParams.get("id_token")

  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value

  if (!state || !savedState || state !== savedState) {
    return redirectApp("/?auth=login&error=invalid_state", request)
  }

  try {
    let email = "apple.user@bankspace.com"
    let providerAccountId = "apple_sub_" + Date.now()
    let name = "Apple User"

    // Parse ID token if provided by Apple
    if (idTokenStr) {
      const decoded: any = jwt.decode(idTokenStr)
      if (decoded && decoded.sub) {
        providerAccountId = decoded.sub
        if (decoded.email) {
          email = decoded.email
        }
      }
    }

    // Parse user object sent by Apple on first authorization
    if (userPayloadRaw) {
      try {
        const parsed = JSON.parse(userPayloadRaw)
        if (parsed.name) {
          const first = parsed.name.firstName || ""
          const last = parsed.name.lastName || ""
          name = `${first} ${last}`.trim() || name
        }
        if (parsed.email) {
          email = parsed.email
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    const { token } = await findOrCreateOAuthAccount({
      provider: "apple",
      providerAccountId,
      email,
      name,
      idToken: idTokenStr || undefined,
    })

    const dashboardUrl = new URL("/dashboard", origin).toString()
    const response = NextResponse.redirect(dashboardUrl)

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" })
    response.cookies.set("oauth_nonce", "", { maxAge: 0, path: "/" })

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign in with Apple failed"
    return redirectApp("/?auth=login&error=" + encodeURIComponent(message), request)
  }
}

export async function GET(request: Request) {
  return handleAppleCallback(request)
}

export async function POST(request: Request) {
  return handleAppleCallback(request)
}

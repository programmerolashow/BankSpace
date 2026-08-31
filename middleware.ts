import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPrefixes = [
  "/dashboard",
  "/complete-profile",
  "/settings",
  "/accounts",
  "/cards",
  "/transfer",
  "/transactions",
  "/analytics",
  "/investments",
  "/budgets",
  "/savings",
  "/profile",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authToken = request.cookies.get("auth")?.value
  const isAuthenticated = Boolean(authToken && authToken !== "")

  // Dedicated Admin Guard for /admin and /admin/* (except login & register)
  if (
    (pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/register"))) &&
    !isAuthenticated
  ) {
    const adminLoginUrl = new URL("/admin/login", request.url)
    return NextResponse.redirect(adminLoginUrl)
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/", request.url)
    loginUrl.searchParams.set("auth", "login")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/complete-profile",
    "/settings/:path*",
    "/accounts/:path*",
    "/cards/:path*",
    "/transfer/:path*",
    "/transactions/:path*",
    "/analytics/:path*",
    "/investments/:path*",
    "/budgets/:path*",
    "/savings/:path*",
    "/profile/:path*",
    "/admin",
    "/admin/:path*",
  ],
}

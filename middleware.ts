import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedPrefixes = [
  "/dashboard",
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
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isAuthenticated = request.cookies.get("auth")?.value === "demo"

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
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
  ],
}

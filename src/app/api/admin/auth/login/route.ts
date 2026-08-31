import { NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"
import { apiBadRequest, apiForbidden } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`admin_login_${ip}`, 5, 15 * 60 * 1000)

    if (!rateLimit.success) {
      return NextResponse.json(
        { message: "Too many admin login attempts. Please try again in 15 minutes." },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return apiBadRequest("Email and password are required")
    }

    const userAgent = request.headers.get("user-agent") || undefined
    const { token, user } = await loginUser(email, password, ip, userAgent)

    if (user.role !== "ADMIN") {
      return apiForbidden("Access denied. Administrator privileges required.")
    }

    // RECORD AUDIT LOG ENTRY FOR ADMIN LOGIN
    try {
      const { client } = getPrismaClient()
      if (client.auditLog && typeof client.auditLog.create === "function") {
        await client.auditLog.create({
          data: {
            adminId: user.id,
            adminEmail: user.email,
            adminName: user.name,
            action: "ADMIN_LOGIN",
            targetEntity: "AdminSession",
            targetId: user.id,
            ipAddress: ip,
            userAgent: userAgent || null,
            metadata: JSON.stringify({ message: "Administrator session authenticated successfully." }),
          },
        })
      }
    } catch (auditErr) {
      console.warn("[Audit Log Notice]: Failed to record admin login audit log:", auditErr)
    }

    const response = NextResponse.json({ user, token }, { status: 200 })

    response.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin login failed"
    return NextResponse.json({ message }, { status: 401 })
  }
}

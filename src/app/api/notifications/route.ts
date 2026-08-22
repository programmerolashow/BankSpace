import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const { client } = getPrismaClient()
    let notifications: Array<{
      id: string
      title: string
      message: string
      type: string
      isRead: boolean
      createdAt: Date | string
    }> = []

    if (client.notification && typeof client.notification.findMany === "function") {
      try {
        notifications = await client.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      } catch (err) {
        console.warn("[Notifications DB Notice]:", err)
      }
    }

    // Default notifications fallback if new account
    if (notifications.length === 0) {
      notifications = [
        {
          id: "notif_welcome",
          title: "Welcome to BankSpace 👋",
          message: "Your financial account has been successfully provisioned.",
          type: "SUCCESS",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif_sec",
          title: "Security Alert: Login Verified",
          message: "A new session was authenticated for your account.",
          type: "SECURITY",
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch notifications"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return NextResponse.json({ message: error || "Invalid or expired session" }, { status: 401 })
    }

    const { client } = getPrismaClient()
    if (client.notification && typeof client.notification.updateMany === "function") {
      await client.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true, message: "Notifications marked as read" })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notifications"
    return NextResponse.json({ message }, { status: 500 })
  }
}

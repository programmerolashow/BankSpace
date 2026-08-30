/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySessionToken } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { apiUnauthorized, apiBadRequest, apiInternalError } from "@/lib/errors"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const { client } = getPrismaClient()
    let notifications: any[] = []

    if (client.notification && typeof client.notification.findMany === "function") {
      notifications = await client.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications,
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth")?.value

    if (!authToken) {
      return apiUnauthorized()
    }

    const { valid, user, error } = await verifySessionToken(authToken)
    if (!valid || !user) {
      return apiUnauthorized(error || "Invalid or expired session")
    }

    const body = await request.json().catch(() => ({}))
    const { notificationId, markAll } = body

    const { client } = getPrismaClient()

    if (client.notification) {
      if (markAll) {
        await client.notification.updateMany({
          where: { userId: user.id, isRead: false },
          data: { isRead: true },
        })
      } else if (notificationId) {
        await client.notification.updateMany({
          where: { id: notificationId, userId: user.id },
          data: { isRead: true },
        })
      } else {
        return apiBadRequest("Please provide a notification ID or markAll flag.")
      }
    }

    return NextResponse.json({
      success: true,
      message: markAll ? "All notifications marked as read." : "Notification marked as read.",
    })
  } catch (err) {
    return apiInternalError(err)
  }
}

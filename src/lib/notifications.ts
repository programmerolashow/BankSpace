/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "./prisma"

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "SECURITY" = "INFO",
  prismaInstance?: any
) {
  const prisma = prismaInstance || getPrismaClient().client

  if (!prisma.notification || typeof prisma.notification.create !== "function") {
    return
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    })
  } catch (err) {
    console.warn("[Create Notification Notice]:", err)
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: "INFO" | "SUCCESS" | "WARNING" | "SECURITY" = "WARNING",
  prismaInstance?: any
) {
  const prisma = prismaInstance || getPrismaClient().client

  if (!prisma.user || !prisma.notification) {
    return
  }

  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    if (adminUsers.length === 0) return

    await Promise.all(
      adminUsers.map((admin: any) =>
        createNotification(admin.id, title, message, type, prisma)
      )
    )
  } catch (err) {
    console.warn("[Notify Admins Notice]:", err)
  }
}

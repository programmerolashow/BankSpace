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

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as PrismaModule from "@prisma/client"

// Universal PrismaClient constructor resolver for all TypeScript IDEs & Next.js bundlers
const PrismaClientConstructor =
  (PrismaModule as any).PrismaClient ||
  (PrismaModule as any).default?.PrismaClient ||
  (PrismaModule as any)

const globalForPrisma = globalThis as unknown as {
  prisma?: any
}

// In-memory store fallback for when DATABASE_URL is not yet defined
class MemoryUserStore {
  private users: any[] = []

  async findUnique({ where }: any) {
    if (where.email) {
      return this.items.find((u) => u.email?.toLowerCase() === where.email?.toLowerCase()) || null
    }
    return null
  }

  private get items() {
    return this.users
  }

  async create({ data }: any) {
    const id = "cuid_" + Math.random().toString(36).substring(2, 10)
    const user = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      createdAt: new Date(),
    }
    this.users.push(user)
    return user
  }
}

const memoryStore = new MemoryUserStore()

export function getPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (dbUrl && !dbUrl.includes("sample-endpoint")) {
    try {
      const client =
        globalForPrisma.prisma ||
        new PrismaClientConstructor({
          log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
        })

      globalForPrisma.prisma = client

      return { client, isFallback: false }
    } catch (e: any) {
      console.warn("[Prisma Initialization Warning]:", e.message)
    }
  }

  // Fallback helper for unconfigured or placeholder connection strings
  const fallbackClient: any = {
    user: memoryStore,
    $queryRaw: async () => [{ mode: "in-memory-fallback" }],
  }

  return { client: fallbackClient, isFallback: true }
}

export const db = getPrismaClient()

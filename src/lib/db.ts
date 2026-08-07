/* eslint-disable @typescript-eslint/no-explicit-any */
import { neon } from "@neondatabase/serverless"

// In-memory fallback for when DATABASE_URL is not yet defined
class MemoryPgStore {
  private users: any[] = []

  async query(statement: string, params: any[] = []): Promise<any[]> {
    const s = statement.toUpperCase()

    if (s.includes("CREATE TABLE")) {
      return []
    }

    if (s.includes("SELECT") && s.includes("NOW()")) {
      return [{ now: new Date().toISOString(), mode: "in-memory-fallback" }]
    }

    if (s.includes("SELECT") && s.includes("FROM USERS")) {
      const emailParam = (params[0] || "").toLowerCase()
      const found = this.users.find((u) => u.email?.toLowerCase() === emailParam)
      return found ? [found] : []
    }

    if (s.includes("INSERT INTO USERS")) {
      const [name, email, password_hash] = params
      const id = this.users.length + 1
      const user = {
        id,
        name,
        email: email.toLowerCase(),
        password_hash,
        created_at: new Date().toISOString(),
      }
      this.users.push(user)
      return [user]
    }

    return []
  }
}

const memoryStore = new MemoryPgStore()
let isSchemaInitialized = false

export function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL

  if (dbUrl && !dbUrl.includes("sample-endpoint")) {
    const sql = neon(dbUrl)
    return {
      isFallback: false,
      query: async (statement: string, params: any[] = []) => {
        if (!isSchemaInitialized) {
          try {
            await sql`
              CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
            `
            isSchemaInitialized = true
          } catch (e: any) {
            console.warn("[NeonDB Schema Init Warning]:", e.message)
          }
        }
        return (sql as any)(statement, params)
      },
    }
  }

  return {
    isFallback: true,
    query: (statement: string, params: any[] = []) => memoryStore.query(statement, params),
  }
}

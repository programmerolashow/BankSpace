const { neon } = require("@neondatabase/serverless")
require("dotenv").config()

async function testNeonHttp() {
  const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_82OSUjzFlcgG@ep-crimson-mode-axz6uo4h-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

  console.log("Testing Neon Serverless HTTP Fetch Connection...")
  console.log("Connection string:", connectionString.replace(/:[^:@]+@/, ":****@"))

  try {
    const sql = neon(connectionString)
    const result = await sql`SELECT NOW(), version();`
    console.log("==================================================")
    console.log("  ✅ NEON SERVERLESS DATABASE CONNECTED OVER HTTP!")
    console.log("==================================================")
    console.log("  Current DB Time:", result[0].now)
    console.log("  Postgres Version:", result[0].version)
  } catch (err) {
    console.error("❌ Neon HTTP Fetch Connection Failed:", err)
  }
}

testNeonHttp()

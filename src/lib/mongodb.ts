import { MongoClient, type Db } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || "bankite_app"

type MongoConnection = {
  client: MongoClient
  db: Db
}

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoConnection?: Promise<MongoConnection>
}

export async function connectToDatabase(): Promise<MongoConnection> {
  if (!globalWithMongo._mongoConnection) {
    if (!uri) {
      throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
    }

    const client = new MongoClient(uri)
    globalWithMongo._mongoConnection = client.connect().then(() => ({
      client,
      db: client.db(dbName),
    }))
  }

  return globalWithMongo._mongoConnection
}

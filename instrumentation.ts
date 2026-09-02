import * as Sentry from "@sentry/nextjs"

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) {
    return
  }

  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV !== "test",
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    enableLogs: true,
  })
}

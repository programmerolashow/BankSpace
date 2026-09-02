/* eslint-disable @typescript-eslint/no-explicit-any */
export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) {
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs")
    if (Sentry && typeof Sentry.init === "function") {
      Sentry.init({
        dsn,
        enabled: process.env.NODE_ENV !== "test",
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
        enableLogs: true,
      })
    }
  } catch {
    // Sentry optional in build environment
  }
}

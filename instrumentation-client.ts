/* eslint-disable @typescript-eslint/no-explicit-any */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
let captureRouterStart: any = undefined

if (dsn) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs")
    if (Sentry && typeof Sentry.init === "function") {
      const replayFn = Sentry.replayIntegration
      Sentry.init({
        dsn,
        enabled: process.env.NODE_ENV !== "test",
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        enableLogs: true,
        integrations: typeof replayFn === "function" ? [replayFn()] : [],
      })
      captureRouterStart = Sentry.captureRouterTransitionStart
    }
  } catch {
    // Sentry optional in build environment
  }
}

export const onRouterTransitionStart = captureRouterStart

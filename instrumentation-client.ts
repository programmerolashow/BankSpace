/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const replayFn = (Sentry as any).replayIntegration
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
}

export const onRouterTransitionStart = (Sentry as any).captureRouterTransitionStart

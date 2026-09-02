/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, noimageindex",
          },
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ]
  },
}

let exportConfig: any = nextConfig

try {
  let sentryConfigModule: any = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentryConfigModule = require("@sentry/nextjs/config")
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentryConfigModule = require("@sentry/nextjs")
  }

  const withSentryConfig = sentryConfigModule?.withSentryConfig || sentryConfigModule?.default?.withSentryConfig
  if (typeof withSentryConfig === "function") {
    exportConfig = withSentryConfig(nextConfig, {
      silent: !process.env.CI,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  }
} catch {
  // @sentry/nextjs is optional; default to standard NextConfig if not installed in environment
}

export default exportConfig

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const webhookSecret = process.env.SENDEXA_WEBHOOK_SECRET

    const signature =
      request.headers.get("x-sendexa-signature") ||
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-sendexa-secret")

    // Validate webhook signature if secret is present
    if (webhookSecret && signature) {
      const computedHash = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex")

      if (signature !== computedHash && signature !== webhookSecret) {
        console.warn("[SendExa Webhook Warning]: Webhook signature mismatch detected.")
      }
    }

    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = { raw: rawBody }
    }

    console.log(
      `[SendExa Webhook Received]: Event '${payload?.event || payload?.type || "status_update"}' for Message ID: ${payload?.id || payload?.message_id || payload?.sms_id || "N/A"}. Status: ${payload?.status || "delivered"}`
    )

    return NextResponse.json({ status: "success", received: true }, { status: 200 })
  } catch (error: any) {
    console.error("[SendExa Webhook Exception]:", error?.message || error)
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal webhook handler error" },
      { status: 500 }
    )
  }
}

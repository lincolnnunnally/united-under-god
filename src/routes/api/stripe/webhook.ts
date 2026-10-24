import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { stripeConfig, verifyStripeSignature } from "@/lib/membership";
import { applyStripeEvent, type StripeEvent } from "@/lib/membership-store";

const hmacHex = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload, "utf8").digest("hex");
const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Stripe webhook for member church subscriptions.
 *
 * Add in the Stripe dashboard: https://www.unitedundergod.org/api/stripe/webhook
 * Events: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 *
 * Dormant (503) until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set.
 * A bad signature is 400 and changes nothing.
 */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const config = stripeConfig();
        if (!config.ready) {
          return Response.json({ ok: false, message: "Membership billing is not configured." }, { status: 503 });
        }
        const payload = await request.text();
        const valid = verifyStripeSignature({
          payload,
          header: request.headers.get("stripe-signature"),
          secret: config.webhookSecret,
          hmacHex,
          safeEqual,
        });
        if (!valid) {
          return Response.json({ ok: false, message: "Invalid signature." }, { status: 400 });
        }
        let event: StripeEvent;
        try {
          event = JSON.parse(payload) as StripeEvent;
        } catch {
          return Response.json({ ok: false, message: "Invalid payload." }, { status: 400 });
        }
        if (!event?.id || !event?.type || !event?.data?.object) {
          return Response.json({ ok: false, message: "Invalid event." }, { status: 400 });
        }
        try {
          const result = await applyStripeEvent(await getSql(), event);
          return Response.json({ ok: true, ...result });
        } catch (err) {
          // 500 makes Stripe retry; the event was not recorded as processed.
          console.error(`[membership] webhook ${event.type} failed:`, err instanceof Error ? err.message : err);
          return Response.json({ ok: false, message: "Not applied; Stripe will retry." }, { status: 500 });
        }
      },
    },
  },
});

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clampAmount, EIN, LIVE_GIVE_URL } from "@/lib/giving-shared";

const STRIPE_API = "https://api.stripe.com/v1";

function formBody(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.append(k, String(v));
  }
  return body.toString();
}

export const startGift = createServerFn({ method: "POST" })
  .validator(
    z.object({
      amountCents: z.number(),
      recurring: z.boolean(),
      email: z.string(),
      name: z.string(),
      message: z.string(),
      anonymous: z.boolean(),
      hp: z.string(),
      origin: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.hp) return { error: "That request didn't look right." };

    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    const amountCents = clampAmount(data.amountCents);
    if (!email.includes("@") || email.length < 5 || email.length > 320) {
      return { error: "Please give us an email we can send your receipt to." };
    }
    if (!amountCents) {
      return { error: "Please choose an amount between $1 and $50,000." };
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return { url: LIVE_GIVE_URL };
    }

    let origin = LIVE_GIVE_URL.replace(/\/give$/, "");
    try {
      const parsed = new URL(data.origin);
      const host = parsed.hostname;
      if (
        host === "unitedundergod.org" ||
        host === "www.unitedundergod.org" ||
        host.endsWith(".unitedundergod.org") ||
        host.endsWith(".grok-sandbox.com") ||
        host === "localhost" ||
        host === "127.0.0.1"
      ) {
        origin = parsed.origin;
      }
    } catch {
      /* keep live origin */
    }

    const recurring = data.recurring;
    const body = formBody({
      mode: recurring ? "subscription" : "payment",
      success_url: `${origin}/give/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give?cancelled=1`,
      customer_email: email,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": amountCents,
      "line_items[0][price_data][product_data][name]": recurring
        ? "Monthly gift to United Under God"
        : "Gift to United Under God",
      "line_items[0][price_data][product_data][metadata][app]": "united-under-god",
      "line_items[0][price_data][product_data][metadata][kind]": "donation",
      ...(recurring
        ? { "line_items[0][price_data][recurring][interval]": "month" }
        : {}),
      "metadata[app]": "united-under-god",
      "metadata[app_slug]": "united-under-god",
      "metadata[kind]": "donation",
      "metadata[donor_name]": name.slice(0, 200),
      "metadata[ein]": EIN,
      "metadata[anonymous]": data.anonymous ? "true" : "false",
      "metadata[message]": data.message.trim().slice(0, 500),
      ...(recurring
        ? {}
        : {
            "payment_intent_data[metadata][app]": "united-under-god",
            "payment_intent_data[metadata][kind]": "donation",
          }),
    });

    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      return {
        error: json.error?.message || "We couldn't start that gift. Please try again in a moment.",
      };
    }
    return { url: json.url };
  });

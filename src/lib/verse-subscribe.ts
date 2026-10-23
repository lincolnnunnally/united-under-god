import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

function callerIp() {
  try {
    const request = getRequest();
    const forwarded = request.headers.get("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
    return ip.slice(0, 64);
  } catch {
    return "";
  }
}

const subscribeInput = z.object({
  email: z.string(),
  sourcePath: z.string(),
  hp: z.string(),
});

const tokenInput = z.object({
  token: z.string(),
});

export const subscribeToDailyVerse = createServerFn({ method: "POST" })
  .validator(subscribeInput)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { requestVerseSubscription } = await import("@/lib/verse-mail.server");
    return requestVerseSubscription(await getSql(), {
      email: data.email,
      sourcePath: data.sourcePath,
      hp: data.hp,
      ip: callerIp(),
      apiKey: process.env.RESEND_API_KEY,
    });
  });

export const confirmDailyVerse = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { confirmVerseToken } = await import("@/lib/verse-mail.server");
    return confirmVerseToken(await getSql(), data.token);
  });

export const unsubscribeDailyVerse = createServerFn({ method: "POST" })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const { unsubscribeVerseToken } = await import("@/lib/verse-mail.server");
    return unsubscribeVerseToken(await getSql(), data.token);
  });

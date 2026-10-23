import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    if (data.hp.trim()) {
      return {
        ok: true as const,
        state: "pending" as const,
        message: "Check your inbox for a note from United Under God. Open it and confirm, and the daily verse will start.",
      };
    }
    const { getSql } = await import("@/lib/db");
    const { requestVerseSubscription } = await import("@/lib/verse-mail.server");
    return requestVerseSubscription(await getSql(), {
      email: data.email,
      sourcePath: data.sourcePath,
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

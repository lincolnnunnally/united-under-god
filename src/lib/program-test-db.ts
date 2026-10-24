import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import type { SendMail } from "./vendor-store.ts";

/**
 * Test helpers for the vendor program: an in-memory database with the buying
 * migrations applied, and a mailbox that records what would have been sent.
 * Used only by the *.test.ts files; nothing leaves the test.
 */

export const PROGRAM_MIGRATIONS = [
  "0004_source_buying.sql",
  "0006_source_bid_category.sql",
  "0007_source_vendors.sql",
  "0008_source_vendor_cases.sql",
  "0010_source_vendor_portal.sql",
];

export function pgliteSql(pg: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> =>
    (await pg.query<T>(text, params)).rows;
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

export async function freshProgramDb(files = PROGRAM_MIGRATIONS): Promise<Sql> {
  const pg = new PGlite();
  await pg.waitReady;
  for (const file of files) {
    await pg.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  return pgliteSql(pg);
}

export function mailbox(fail = false) {
  const sent: { to: string; subject: string; text: string }[] = [];
  const send: SendMail = async (args) => {
    if (fail) return { ok: false, error: "rejected" };
    sent.push(args);
    return { ok: true, error: "" };
  };
  return { sent, send };
}

/** The private link in an email, and its token. */
export function linkIn(text: string, path: string) {
  const match = text.match(new RegExp(`https://[^\\s]*${path.replace(/\//g, "\\/")}[^\\s]*`));
  if (!match) throw new Error(`no ${path} link in the email`);
  const url = new URL(match[0]);
  return { url, token: url.searchParams.get("t") ?? "" };
}

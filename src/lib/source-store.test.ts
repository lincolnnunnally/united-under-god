import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { pgliteBootstrapAllowed } from "./db-runtime.ts";
import {
  addQuote,
  createBid,
  listBook,
  listBuyingBook,
  publishAward,
  readDesk,
  setItemWinners,
  setQuoteStatus,
} from "./source-store.ts";

function toSql(pg: PGlite): Sql {
  const run = async <T>(text: string, params: unknown[]): Promise<T[]> => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  };
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0] ?? "";
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1] ?? ""}`;
    }
    return run<T>(text, values);
  }) as Sql;
  sql.query = (text, params = []) => run(text, params);
  return sql;
}

async function fresh() {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(
    readFileSync(new URL("../../migrations/0004_source_buying.sql", import.meta.url), "utf8"),
  );
  return toSql(pg);
}

test("listBuyingBook returns [] when db unavailable", async () => {
  const missingDataFile = await listBuyingBook(async () => {
    throw Object.assign(
      new Error("ENOENT: no such file or directory, open '/var/task/_libs/pglite.data'"),
      { code: "ENOENT" },
    );
  });
  assert.deepEqual(missingDataFile, []);

  const refused = new Error("The database is not available, so this was not saved.");
  refused.name = "DbUnavailableError";
  const named = await listBuyingBook(async () => {
    throw refused;
  });
  assert.deepEqual(named, []);
});

test("listBuyingBook still throws when the failure is not a missing database", async () => {
  await assert.rejects(
    () =>
      listBuyingBook(async () => {
        throw new Error("query failed: column does not exist");
      }),
    /column does not exist/,
  );
});

test("PGLite bootstrap stays off on the Vercel task filesystem", () => {
  assert.equal(pgliteBootstrapAllowed({ VERCEL: "1" }, "/var/task"), false);
  assert.equal(pgliteBootstrapAllowed({ VERCEL_ENV: "production" }, "/var/task"), false);
  assert.equal(pgliteBootstrapAllowed({ AWS_LAMBDA_FUNCTION_NAME: "fn" }, "/var/task"), false);
  assert.equal(pgliteBootstrapAllowed({}, "/var/task"), false);
  assert.equal(pgliteBootstrapAllowed({ NODE_ENV: "production" }, "/workspace"), true);
});

test("empty buying book is empty", async () => {
  const sql = await fresh();
  const book = await listBook(sql);
  const desk = await readDesk(sql);
  assert.deepEqual(book, []);
  assert.equal(desk.bookCount, 0);
  assert.deepEqual(desk.bids, []);
});

test("bid, two quotes, two winners, one published entry", async () => {
  const sql = await fresh();
  const bidId = await createBid(
    sql,
    {
      title: "Copy paper",
      summary: "Letter size for bulletins",
      neededBy: "2026-10-01",
      items: [
        { description: "Letter paper", quantity: "10", unit: "case" },
        { description: "Black toner", quantity: "2", unit: "cartridge" },
      ],
    },
    "operator-1",
  );
  const deskAfterBid = await readDesk(sql);
  const bid = deskAfterBid.bids[0];
  assert.equal(bid?.id, bidId);
  assert.equal(bid?.items.length, 2);
  const paper = bid!.items.find((item) => item.description === "Letter paper")!;
  const toner = bid!.items.find((item) => item.description === "Black toner")!;

  const alpha = await addQuote(
    sql,
    {
      bidId,
      vendorName: "Alpha Supply",
      vendorContact: "ada@alpha.example",
      lines: [
        { itemId: paper.id, unitPrice: "24.50" },
        { itemId: toner.id, unitPrice: "61" },
      ],
    },
    "operator-1",
  );
  const beta = await addQuote(
    sql,
    {
      bidId,
      vendorName: "Beta Goods",
      lines: [
        { itemId: paper.id, unitPrice: "$22.00" },
        { itemId: toner.id, unitPrice: "" },
      ],
    },
    "operator-1",
  );

  await setItemWinners(sql, paper.id, [alpha, beta], "operator-1");
  await assert.rejects(
    () => setItemWinners(sql, toner.id, [beta], "operator-1"),
    /priced this item/,
  );
  await setItemWinners(sql, toner.id, [alpha], "operator-1");

  const awarded = await readDesk(sql);
  const paperAwards = awarded.bids[0]!.awards.filter((row) => row.itemId === paper.id);
  assert.equal(paperAwards.length, 2);
  const tonerAwards = awarded.bids[0]!.awards.filter((row) => row.itemId === toner.id);
  assert.equal(tonerAwards.length, 1);

  const publishedId = await publishAward(sql, paperAwards[0]!.id, "operator-1");
  const again = await publishAward(sql, paperAwards[0]!.id, "operator-1");
  assert.equal(again, publishedId);

  const book = await listBook(sql);
  assert.equal(book.length, 1);
  assert.equal(book[0]?.title, "Letter paper");
  assert.equal(book[0]?.vendorName.length > 0, true);
  assert.equal("vendorContact" in (book[0] ?? {}), false);

  await setQuoteStatus(sql, alpha, "withdrawn");
  const afterWithdraw = await readDesk(sql);
  const stillAwarded = afterWithdraw.bids[0]!.awards.map((row) => row.quoteId);
  assert.equal(stillAwarded.includes(alpha), false);
  assert.equal(stillAwarded.includes(beta), true);
  const publicBook = await listBook(sql);
  const alphaStillListed = publicBook.some((entry) => entry.vendorName === "Alpha Supply");
  assert.equal(alphaStillListed, false);
  assert.equal(publicBook.length <= 1, true);
});

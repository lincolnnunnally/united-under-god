import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { readChurchMarket, type ChurchMarketRead } from "@/lib/church-market";

/**
 * Public: church directory counts by state for /buying/sell-to-churches.
 * Cached per server instance; `{ market: null }` when the database is not
 * reachable, so the page hides the numbers and still renders.
 */
export const readChurchMarketFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ChurchMarketRead> => readChurchMarket(() => getSql()),
);

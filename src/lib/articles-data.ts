import { createServerFn } from "@tanstack/react-start";
import { publishedRule, withFallback } from "@/lib/articles";

/**
 * Published writing for this site from the shared `lpl_articles` table (LPL
 * Supabase). Read-only. Only rows for the page's app key (`uug` for
 * /articles, `sanctuary-avl` for Sanctuary AVL guides) that are `published`
 * and whose publish time has arrived count; the server connection may bypass
 * RLS, so the same rule (`publishedRule`) is stated here, not left to the policy.
 */
export type ArticleSummary = {
  slug: string;
  kind: string;
  title: string;
  excerpt: string;
  scriptureRef: string;
  author: string;
  publishedAt: string;
};

export type Article = ArticleSummary & {
  bodyMd: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
};

/** The app keys this site reads from lpl_articles. */
export const ARTICLE_APP = { uug: "uug", sanctuaryAvl: "sanctuary-avl" } as const;
type ArticleApp = (typeof ARTICLE_APP)[keyof typeof ARTICLE_APP];

/** How long a library read may take on a page that has hand-written content to fall back on. */
const LIBRARY_TIMEOUT_MS = 3500;

const SUMMARY_COLUMNS = `
  slug, kind, title,
  coalesce(excerpt, '') as excerpt,
  coalesce(scripture_ref, '') as scripture_ref,
  coalesce(nullif(author, ''), 'Lincoln Nunnally') as author,
  to_char(coalesce(published_at, publish_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as published_at
`;

type Row = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function toSummary(r: Row): ArticleSummary {
  return {
    slug: str(r.slug),
    kind: str(r.kind),
    title: str(r.title),
    excerpt: str(r.excerpt),
    scriptureRef: str(r.scripture_ref),
    author: str(r.author) || "Lincoln Nunnally",
    publishedAt: str(r.published_at),
  };
}

async function run(text: string, params: unknown[] = []): Promise<Row[]> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  try {
    return await sql.query<Row>(text, params);
  } catch (error) {
    // A local PGLite database has no shared articles table: nothing published.
    if ((error as { code?: string })?.code === "42P01") return [];
    throw error;
  }
}

async function listPublished(app: ArticleApp): Promise<ArticleSummary[]> {
  const rows = await run(
    `select ${SUMMARY_COLUMNS} from lpl_articles where ${publishedRule("$1")}
     order by coalesce(published_at, publish_at) desc limit 1000`,
    [app],
  );
  return rows.map(toSummary);
}

async function findPublished(app: ArticleApp, slug: string): Promise<Article | null> {
  if (!slug) return null;
  const rows = await run(
    `select ${SUMMARY_COLUMNS}, body_md, tags,
       coalesce(seo_title, '') as seo_title,
       coalesce(seo_description, '') as seo_description,
       to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
     from lpl_articles where ${publishedRule("$1")} and slug = $2 limit 1`,
    [app, slug],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...toSummary(r),
    bodyMd: str(r.body_md),
    tags: Array.isArray(r.tags) ? r.tags.map(str).filter(Boolean) : [],
    seoTitle: str(r.seo_title),
    seoDescription: str(r.seo_description),
    updatedAt: str(r.updated_at),
  };
}

const slugValidator = (slug: unknown) => {
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,200}$/i.test(slug)) return "";
  return slug;
};

export const getArticles = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArticleSummary[]> => listPublished(ARTICLE_APP.uug),
);

export const getArticle = createServerFn({ method: "GET" })
  .validator(slugValidator)
  .handler(async ({ data: slug }): Promise<Article | null> => findPublished(ARTICLE_APP.uug, slug));

/**
 * Sanctuary AVL guides from the shared library (app `sanctuary-avl`). They sit
 * beside the hand-written guides, so a slow or failing read yields none rather
 * than an error: the hand-written guides always render.
 */
export const getAvlLibraryGuides = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArticleSummary[]> =>
    withFallback(listPublished(ARTICLE_APP.sanctuaryAvl), LIBRARY_TIMEOUT_MS, []),
);

export const getAvlLibraryGuide = createServerFn({ method: "GET" })
  .validator(slugValidator)
  .handler(async ({ data: slug }): Promise<Article | null> =>
    withFallback(findPublished(ARTICLE_APP.sanctuaryAvl, slug), LIBRARY_TIMEOUT_MS, null),
  );

/** Shared CDN caching for article pages: fresh for 10 minutes, then revalidate. */
export const ARTICLE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
};

export { formatArticleDate } from "@/lib/articles";

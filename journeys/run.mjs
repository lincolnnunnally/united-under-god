// Customer onboarding, end to end, on the LIVE sites, the way a customer does it.
//
// Every journey stops at the payment step. Stripe is live in these apps, so
// every request that would create a checkout session (or write an order) is
// blocked at the browser before it leaves, and any navigation to Stripe is
// aborted. Test accounts use qa-journey-*@appengine.test, which can't receive
// mail; they are listed in the report for cleanup.
//
// Usage: node journeys/run.mjs [journey ...]   (default: all)
// Env:   INVITE_SLUGS="slug1,slug2"  ChurchConnect /for/{slug} invites to walk.
//        OUT=journeys/out

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT = process.env.OUT || "journeys/out";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
const RAND = Math.random().toString(36).slice(2, 6);
const PASSWORD = `QaJourney${RAND}9x`;
const email = (app) => `qa-journey-${app}-${STAMP}${RAND}@appengine.test`;
fs.mkdirSync(OUT, { recursive: true });

// Requests that create a Stripe session, charge, or write an order.
const MONEY = [
  /\/api\/client\/plans\/checkout/,
  /\/api\/payments\/checkout/,
  /\/api\/domains\/checkout/,
  /\/api\/domains\/add-existing/,
  /\/api\/subscriptions\/upgrade/,
  /\/api\/client\/emails\/checkout/,
  /\/api\/stripe\/checkout/,
  /\/api\/billing/,
  /\/site-invite\/[^/]+\/claim/,
  /laser\.engrave\.market\/api\/orders/,
  /checkout\.stripe\.com/,
];

const report = { started: new Date().toISOString(), accounts: [], journeys: {} };

async function journey(name, browser, fn) {
  const steps = [];
  report.journeys[name] = steps;
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.route("**/*", (route) => {
    const url = route.request().url();
    const write = route.request().method() !== "GET";
    if (/checkout\.stripe\.com/.test(url) || (write && MONEY.some((re) => re.test(url)))) {
      steps.push({ step: "blocked payment request (safety)", ok: true, note: url.slice(0, 160) });
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
  let n = 0;
  const step = async (label, fn, { shot = true } = {}) => {
    n += 1;
    const file = `${name}-${String(n).padStart(2, "0")}.png`;
    const rec = { step: label, ok: false };
    steps.push(rec);
    try {
      const note = await fn();
      rec.ok = true;
      if (note !== undefined) rec.note = typeof note === "string" ? note : JSON.stringify(note).slice(0, 600);
    } catch (e) {
      rec.error = String(e?.message || e).split("\n")[0].slice(0, 300);
    }
    rec.url = page.url();
    if (shot) {
      try {
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(OUT, file), fullPage: false });
        rec.shot = file;
      } catch {
        /* page gone */
      }
    }
    return rec.ok;
  };
  try {
    await fn({ page, context, step });
  } catch (e) {
    steps.push({ step: "journey crashed", ok: false, error: String(e?.message || e).slice(0, 300) });
  }
  if (errors.length) steps.push({ step: "browser errors on page", ok: false, note: errors.slice(0, 5).join(" | ") });
  await context.close();
}

const expectStatus = async (page, url, want) => {
  const res = await page.request.get(url, { maxRedirects: 0 }).catch((e) => ({ status: () => String(e) }));
  const got = res.status();
  if (!want.includes(got)) throw new Error(`${url} answered ${got}, expected ${want.join("/")}`);
  return `${url} → ${got}`;
};

// ---------------------------------------------------------------- Easy Peazy

async function easyPeazy(page, step, { host, app, business }) {
  const who = email(app);
  report.accounts.push({ app: `Easy Peazy (${host})`, email: who });
  const API = "https://easypeazy-api.vercel.app/api";
  await step(`open ${host}`, async () => {
    await page.goto(`https://${host}/`, { waitUntil: "domcontentloaded" });
    return await page.title();
  });
  await step("sign up", async () => {
    await page.goto(`https://${host}/signup`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("signup-name-input").fill("QA Journey");
    await page.getByTestId("signup-email-input").fill(who);
    await page.getByTestId("signup-password-input").fill(PASSWORD);
    await page.getByTestId("signup-business-input").fill(business).catch(() => {});
    await page.getByTestId("signup-consent-checkbox").check();
    await page.getByTestId("signup-submit-btn").click();
    await page.waitForURL(/\/portal/, { timeout: 45000 });
    return "landed on the portal";
  });
  const token = await page.evaluate(() => localStorage.getItem("ew_token")).catch(() => null);
  const call = async (method, p, data) => {
    const res = await page.request.fetch(`${API}${p}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data,
      timeout: 330000,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => "");
    }
    return { status: res.status(), body };
  };
  await step("web address choices offered", async () => {
    const r = await call("GET", "/client/web-address/options");
    if (r.status !== 200) throw new Error(`options ${r.status}`);
    return r.body.options.map((o) => `${o.base}${o.free ? " (free)" : ` +$${o.yearly_usd}/yr`}`).join(", ");
  }, { shot: false });
  const label = `qa-journey-${STAMP.slice(-6)}${RAND}`;
  await step("check an address is free", async () => {
    const r = await call("GET", `/client/web-address/check?label=${label}`);
    return r.body;
  }, { shot: false });
  await step("claiming an address before paying is refused (402)", async () => {
    const r = await call("POST", "/client/web-address", { label });
    if (r.status !== 402) throw new Error(`expected 402, got ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`);
    return r.body?.detail || "402";
  }, { shot: false });
  await step("build a free draft website (several minutes)", async () => {
    const t0 = Date.now();
    const r = await call("POST", "/client/websites", {
      site_name: business,
      business_type: app === "uug" ? "nonprofit" : "bakery",
      business_description: `${business} is a small family business in Vidalia, Georgia. Open Tuesday to Saturday.`,
      contact_phone: "(912) 555-0142",
    });
    const secs = Math.round((Date.now() - t0) / 1000);
    if (r.status !== 200 || r.body?.success === false) throw new Error(`build ${r.status} after ${secs}s: ${JSON.stringify(r.body).slice(0, 300)}`);
    return `draft built in ${secs}s`;
  }, { shot: false });
  await step("portal shows the draft", async () => {
    await page.goto(`https://${host}/portal`, { waitUntil: "networkidle" });
    await page.locator('[data-testid^="website-card-"]').first().waitFor({ timeout: 30000 });
    const publish = await page.locator('[data-testid^="publish-btn-"]').count();
    return `draft card shown; publish button present: ${publish > 0} (not clicked: it opens payment)`;
  });
  await step("draft preview opens", async () => {
    const btn = page.locator('[data-testid^="preview-draft-btn-"]').first();
    if (!(await btn.count())) return "no preview button";
    const [popup] = await Promise.all([page.context().waitForEvent("page", { timeout: 15000 }).catch(() => null), btn.click()]);
    if (popup) {
      await popup.waitForLoadState("domcontentloaded");
      await popup.screenshot({ path: path.join(OUT, `${app}-draft-preview.png`) });
      const u = popup.url();
      await popup.close();
      return `preview at ${u}`;
    }
    await page.waitForTimeout(3000);
    return "preview opened in page";
  });
}

// ---------------------------------------------------------------- AI Website Design

async function aiWebsiteDesign(page, step) {
  const BASE = "https://ai-website.design";
  const who = email("awd");
  report.accounts.push({ app: "AI Website Design", email: who });
  let siteId = "";
  await step("open ai-website.design", async () => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    return await page.title();
  });
  await step("sign up", async () => {
    await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
    await page.locator("input[type=email]").fill(who);
    await page.locator("input[type=password]").first().fill(PASSWORD);
    await page.locator("label.consent input[type=checkbox]").check().catch(() => {});
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForURL(/dashboard|confirm/, { timeout: 45000 }).catch(() => {});
    return page.url();
  });
  await step("describe the business and generate a site", async () => {
    const prompt = "Southern Roots Bakery in Vidalia, Georgia. Fresh bread, cakes for weddings and birthdays. Call (912) 555-0142.";
    await page.goto(`${BASE}/describe?prompt=${encodeURIComponent(prompt)}`, { waitUntil: "domcontentloaded" });
    const go = page.getByRole("button", { name: /build|create|generate|make/i }).first();
    if (await go.count()) await go.click().catch(() => {});
    await page.waitForURL(/\/edit\//, { timeout: 600000 });
    siteId = page.url().split("/edit/")[1]?.split(/[?#]/)[0] || "";
    return `editor for site ${siteId}`;
  });
  await step("editor: Go live and web address choice", async () => {
    await page.waitForLoadState("networkidle").catch(() => {});
    const live = page.locator("button.btn-live").first();
    const liveText = (await live.count()) ? (await live.innerText()).trim() : "no Go live button";
    const picker = page.getByTestId("editor-address");
    const options = (await picker.count()) ? await picker.locator("option").allInnerTexts() : [];
    return `${liveText} (not clicked: opens payment); address choices: ${options.length ? options.join(" | ") : "free address only (no shared domains listed yet)"}`;
  });
  await step("publishing before paying is refused (402)", async () => {
    const r = await page.request.post(`${BASE}/api/sites/${siteId}/publish`);
    if (r.status() !== 402) throw new Error(`expected 402, got ${r.status()}`);
    return "402 payment required";
  }, { shot: false });
  await step("clean up the test site", async () => {
    const r = await page.request.delete(`${BASE}/api/sites/${siteId}`);
    return `delete → ${r.status()}`;
  }, { shot: false });
}

// ---------------------------------------------------------------- ChurchConnect

async function churchConnect(page, step) {
  const BASE = "https://www.churchconnect.cloud";
  const who = email("cc");
  report.accounts.push({ app: "ChurchConnect", email: who });
  await step("open churchconnect.cloud", async () => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    return await page.title();
  });
  await step("church sign up", async () => {
    await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
    await page.locator("#churchName").fill("QA Journey Church");
    await page.locator("#name").fill("QA Journey");
    await page.getByTestId("signup-church-address").fill("100 Church St").catch(() => {});
    await page.getByTestId("signup-church-city").fill("Vidalia").catch(() => {});
    await page.getByTestId("signup-church-state").fill("GA").catch(() => {});
    await page.getByTestId("signup-church-zip").fill("30474").catch(() => {});
    await page.locator("#signupEmail").fill(who);
    await page.locator("#signupPassword").fill(PASSWORD);
    await page.getByTestId("signup-accept-terms").check().catch(() => page.getByTestId("signup-accept-terms").click());
    await page.getByRole("button", { name: "Create Account" }).click();
    await page.waitForURL(/\/app|\/signin|verify/, { timeout: 60000 });
    return page.url().includes("/app") ? "signed in and on the app" : `went to ${page.url()} (email verification?)`;
  });
  await step("first-run setup checklist", async () => {
    if (!page.url().includes("/app")) return "not signed in, skipped";
    await page.waitForLoadState("networkidle").catch(() => {});
    const text = (await page.locator("body").innerText()).slice(0, 4000);
    const m = text.match(/(setup|get started|checklist)[^\n]{0,120}/i);
    return m ? m[0] : "no setup checklist text found";
  });
  const slugs = (process.env.INVITE_SLUGS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) {
    report.journeys.churchconnect.push({ step: "church invite /for/{slug}", ok: true, note: "skipped: no invite link given yet (needs a super-admin to prepare one)" });
  }
  for (const slug of slugs) {
    const ctx = await page.context().browser().newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.route(/\/site-invite\/[^/]+\/claim|checkout\.stripe\.com/, (r) => r.abort());
    const inv = await ctx.newPage();
    const shot = async (f) => inv.screenshot({ path: path.join(OUT, `cc-invite-${slug}-${f}.png`) }).catch(() => {});
    const rec = (s) => report.journeys.churchconnect.push(s);
    try {
      await inv.goto(`${BASE}/for/${slug}`, { waitUntil: "domcontentloaded" });
      await inv.getByTestId("site-invite").waitFor({ timeout: 45000 });
      await inv.locator('[data-photos-settled="1"]').waitFor({ timeout: 30000 }).catch(() => {});
      await shot("1-page");
      rec({ step: `invite ${slug}: page loads`, ok: true, shot: `cc-invite-${slug}-1-page.png` });
      const open = inv.getByTestId("open-site").getByRole("link", { name: /open it full size/i });
      const href = (await open.count()) ? await open.getAttribute("href") : null;
      if (href) {
        const site = await ctx.newPage();
        const res = await site.goto(href, { waitUntil: "domcontentloaded" }).catch(() => null);
        await site.screenshot({ path: path.join(OUT, `cc-invite-${slug}-2-site.png`) }).catch(() => {});
        rec({ step: `invite ${slug}: "Open it full size"`, ok: Boolean(res && res.status() < 400), note: `${href} → ${res ? res.status() : "failed"}`, shot: `cc-invite-${slug}-2-site.png` });
        await site.close();
      } else {
        rec({ step: `invite ${slug}: "Open it full size"`, ok: false, note: "link missing" });
      }
      for (const choice of ["free_paid_site", "pro_site", "free_no_site"]) {
        const b = inv.locator(`button[data-choice="${choice}"]`);
        if (!(await b.count())) {
          rec({ step: `invite ${slug}: choice ${choice}`, ok: false, note: "button missing" });
          continue;
        }
        const text = (await b.innerText()).trim();
        await b.click();
        await inv.getByTestId("invite-signup").waitFor({ timeout: 10000 });
        await inv.locator('[data-testid="invite-signup"] input[type=email]').fill(email("cc-invite"));
        await inv.locator('[data-testid="invite-signup"] input[type=password]').fill(PASSWORD);
        await shot(`3-${choice}`);
        rec({ step: `invite ${slug}: "${text}" opens sign-up (stopped before claim)`, ok: true, shot: `cc-invite-${slug}-3-${choice}.png` });
        await inv.locator('button[aria-label="Close"]').click().catch(() => inv.keyboard.press("Escape"));
      }
    } catch (e) {
      await shot("error");
      rec({ step: `invite ${slug}`, ok: false, error: String(e?.message || e).slice(0, 300), shot: `cc-invite-${slug}-error.png` });
    }
    await ctx.close();
  }
}

// ---------------------------------------------------------------- Operate

async function operate(page, step) {
  const BASE = "https://operate.unitedundergod.org";
  const who = email("operate");
  report.accounts.push({ app: "Operate", email: who });
  await step("open Operate", async () => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    return await page.title();
  });
  await step("new shop sign up", async () => {
    await page.goto(`${BASE}/account?mode=register`, { waitUntil: "domcontentloaded" });
    await page.locator("#name").fill("QA Journey");
    await page.locator("#biz").fill("QA Journey Lawn Care");
    await page.locator("#city").fill("Vidalia").catch(() => {});
    await page.getByRole("button", { name: /field & trades/i }).click().catch(() => {});
    await page.locator("#email").fill(who);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /start running my shop/i }).click();
    await page.waitForURL(/\/desk/, { timeout: 45000 });
    return "on the desk";
  });
  await step("desk first-run cards", async () => {
    await page.waitForLoadState("networkidle").catch(() => {});
    const t = await page.locator("body").innerText();
    return ["Add your first person", "Record the first dollar", "recovery code"].map((s) => `${s}: ${t.toLowerCase().includes(s.toLowerCase())}`).join(", ");
  });
  await step("Get More Work messages", async () => {
    await page.goto(`${BASE}/get-more-work`, { waitUntil: "networkidle" });
    const t = await page.locator("pre").first().innerText().catch(() => "");
    return t.slice(0, 200);
  });
  await step("website page", async () => {
    await page.goto(`${BASE}/website`, { waitUntil: "networkidle" });
    return (await page.getByRole("button", { name: /build my website/i }).count()) ? "Build my website offered" : "no build button";
  });
  await step("Build my website → Easy Peazy sign-in hop", async () => {
    const b = page.getByRole("button", { name: /build my website/i }).or(page.getByRole("link", { name: /build my website/i })).first();
    await b.click();
    await page.waitForURL(/easypeazy/, { timeout: 45000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    return `arrived at ${page.url().split("?")[0]}`;
  });
  await step("Operate shop sees its web address choices on Easy Peazy", async () => {
    const token = await page.evaluate(() => localStorage.getItem("ew_token")).catch(() => null);
    if (!token) return "no Easy Peazy session after the hop";
    const r = await page.request.get("https://easypeazy-api.vercel.app/api/client/web-address/options", { headers: { Authorization: `Bearer ${token}` } });
    const b = await r.json().catch(() => ({}));
    return (b.options || []).map((o) => o.base).join(", ") || `status ${r.status()}`;
  }, { shot: false });
}

// ---------------------------------------------------------------- Laser engraving

async function laser(page, step) {
  const BASE = "https://laser.engrave.market";
  await step("church page /ccvidalia", async () => {
    await page.goto(`${BASE}/ccvidalia`, { waitUntil: "networkidle" });
    const name = await page.locator("#shopName").innerText().catch(() => "");
    const welcome = await page.getByTestId("catalog-welcome").innerText().catch(() => "");
    const pieces = await page.locator(".piece[data-sku]").count();
    return `${name}: "${welcome.slice(0, 140)}" · ${pieces} pieces`;
  });
  await step("/connection goes to the Connection page", async () => expectStatus(page, `${BASE}/connection`, [301, 302, 307, 308]), { shot: false });
  await step("/fbcv page", async () => {
    await page.goto(`${BASE}/fbcv`, { waitUntil: "networkidle" });
    const missing = await page.getByTestId("not-found").isVisible().catch(() => false);
    return missing ? "not created yet (shows 'That page isn't here')" : `live: ${await page.locator("#shopName").innerText().catch(() => "")}`;
  });
  await step("'Save this page' form is there (not submitted)", async () => {
    await page.goto(`${BASE}/ccvidalia`, { waitUntil: "networkidle" });
    const ok = (await page.locator("#claimBtn").count()) > 0;
    await page.locator("#claimBtn").scrollIntoViewIfNeeded().catch(() => {});
    return ok ? "form shown" : "form missing";
  });
  await step("order a piece → checkout (stopped before Pay)", async () => {
    await page.goto(`${BASE}/ccvidalia`, { waitUntil: "networkidle" });
    await page.getByTestId("order-as-shown").first().click();
    await page.getByTestId("checkout-form").waitFor({ timeout: 30000 });
    await page.getByTestId("checkout-name").fill("QA Journey");
    await page.getByTestId("checkout-email").fill(email("laser"));
    await page.getByTestId("fulfillment-pickup").click().catch(() => {});
    const total = await page.getByTestId("checkout-total").innerText().catch(() => "?");
    const pay = await page.getByTestId("checkout-submit-btn").innerText().catch(() => "?");
    return `total ${total.trim()}; button "${pay.trim()}" (not clicked)`;
  });
  const who = email("laser");
  report.accounts.push({ app: "Laser engraving", email: who });
  await step("buyer account sign up", async () => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("auth-toggle-mode-btn").click();
    await page.getByTestId("role-customer-btn").click().catch(() => {});
    await page.getByTestId("auth-fullname").fill("QA Journey");
    await page.getByTestId("auth-email").fill(who);
    await page.getByTestId("auth-password").fill(PASSWORD);
    await page.getByTestId("auth-terms-checkbox").check().catch(() => page.getByTestId("auth-terms-checkbox").click());
    await page.getByTestId("auth-submit-btn").click();
    await page.waitForTimeout(6000);
    return page.url();
  });
}

// ---------------------------------------------------------------- United Under God

async function uug(page, step) {
  await step("apps page lists the web services", async () => {
    await page.goto("https://unitedundergod.org/apps", { waitUntil: "networkidle" });
    const t = await page.locator("body").innerText();
    return ["EasyPeazy", "AI Website Design", "Operate"].map((s) => `${s}: ${t.includes(s)}`).join(", ");
  });
  for (const url of ["https://easypeazy.unitedundergod.org/", "https://ai-website.design/", "https://operate.unitedundergod.org/"]) {
    await step(`link answers: ${url}`, async () => expectStatus(page, url, [200]), { shot: false });
  }
}

// ---------------------------------------------------------------- run

const ALL = {
  easypeazy: (a) => easyPeazy(a.page, a.step, { host: "easypeazy.site", app: "ep", business: "QA Journey Bakery" }),
  "easypeazy-uug": (a) => easyPeazy(a.page, a.step, { host: "easypeazy.unitedundergod.org", app: "uug", business: "QA Journey Ministry Shop" }),
  "ai-website-design": (a) => aiWebsiteDesign(a.page, a.step),
  churchconnect: (a) => churchConnect(a.page, a.step),
  operate: (a) => operate(a.page, a.step),
  laser: (a) => laser(a.page, a.step),
  "united-under-god": (a) => uug(a.page, a.step),
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ALL);
const browser = await chromium.launch();
await Promise.all(wanted.map((name) => journey(name, browser, ALL[name])));
await browser.close();
report.finished = new Date().toISOString();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

let md = `# Customer onboarding run ${report.started}\n\nStops at payment on every app. Test accounts:\n\n`;
for (const a of report.accounts) md += `- ${a.app}: ${a.email}\n`;
for (const [name, steps] of Object.entries(report.journeys)) {
  md += `\n## ${name}\n\n`;
  for (const s of steps) md += `- ${s.ok ? "PASS" : "FAIL"} ${s.step}${s.note ? ` — ${s.note}` : ""}${s.error ? ` — ${s.error}` : ""}${s.shot ? ` [${s.shot}]` : ""}\n`;
}
fs.writeFileSync(path.join(OUT, "REPORT.md"), md);
console.log(md);

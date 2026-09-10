# United Under God — project rules

## Ecosystem dashboard (do not forget)

[dashboard.unitedundergod.org](https://dashboard.unitedundergod.org) is the **one owner desk** for the whole family of apps.

Lincoln goes there to understand, in one glance:

- **Business** — which apps are live, growing, stalled, or need a next step
- **Money** — Stripe revenue, payouts, and labeled streams (gifts from this site are tagged `metadata[app]=united-under-god`)
- **Activity** — people, open help, recent work across every reporting app

From that desk he **selects an app** and walks through one of two doors:

- the app’s **own staff dashboard** (the workbench)
- the app’s **public website**

This website’s staff desk (`/admin`) is for **this app’s work** (seal, pantry donors, pickups). It is not a second owner dashboard. Never invent a parallel “universal dashboard.” Report to the one that already exists.

## Every United Under God app we build or touch must

1. Expose `GET /api/admin/stats`, gated by `APP_ENGINE_STATS_TOKEN` (timing-safe bearer). Numbers only — no names or emails.
   Required shape:

   `{ ok, reporting, users, ticketsOpen, ordersRecent, activeUsers30d, newUsers7d, newUsersPrev7d, generatedAt }`

   Also send identity so the owner desk can open the right doors even if its catalog is stale:

   `{ app, appName, publicUrl, adminUrl }`

   Extra `activity` counts are allowed and ignored if the collector does not know them yet.

2. Forward help / inquiries to `APP_ENGINE_INBOX_URL` (default `https://dashboard.unitedundergod.org/api/engine/inbox`) with bearer `APP_ENGINE_INBOX_TOKEN` or `APP_ENGINE_STATS_TOKEN`. Include `app` and `appName`.

3. Keep its own staff admin for people who run that product. The ecosystem dashboard is the glance; the app admin is the workbench.

4. Tag money with the app slug (`metadata[app]`, `metadata[app_slug]`) so the owner desk can attribute Stripe charges. Do not invent a local revenue number.

5. Never ship an app that is live but silent. If the stats token is missing, the owner desk will honestly say “Not reporting yet.” Set `APP_ENGINE_STATS_TOKEN` on deploy and make sure the owner desk can poll this host (owner-registered live URL or `APP_ENGINE_OPS_TARGETS`).

This site’s mapping (ministry front door, not a storefront):

- `ticketsOpen` / `newUsers*` = people who raised a hand (inquiries)
- `ordersRecent` = 0 (gifts live in Stripe)
- `adminUrl` = `https://unitedundergod.org/admin`
- `publicUrl` = `https://unitedundergod.org`

## Marks

- **United Under God** is the rings and the cross. Tab icon, favicon, and seal (`SealMark`, `/favicon.svg`, `/favicon.ico`, `/icons/seal.ico`, `/favicon-32.png`, `/images/seal.svg`) use that mark only. When the tab icon changes, bump the `?v=` on those links in `__root.tsx` so browsers drop the old cache. Sibling UUG apps (dashboard, Neighborly, Plenty, …) should use this same seal on the tab — never the heart of hands.
- **Live on Mission** is the original card: red bar, condensed word, heart made of hands (`LiveOnMissionMark`, `/images/live-on-mission-heart-and-hands.png`). That mark never goes on the UUG tab.
- Live on Mission has one invitation (`/mission`) and one workbench (`https://liveonmission.unitedundergod.org`, same app as `https://live-on-mission.com`). Spark of Hope is the testimony after the act. ChurchConnect missions is the church’s trip/team desk — not the public invitation.

## Accounts

- **Public members** (churches, businesses, charities, households) sign in on this site (`/login` → `/account`). They keep the seal, united buying, Live on Mission, and volunteer stands here.
- **Staff** use the same door; after sign-in they land on `/admin`. The desk is not for public members.
- **Pantry neighbors** (need food, donate groceries, pantry shifts) sign in on [Plenty](https://plenty.unitedundergod.org), not here.



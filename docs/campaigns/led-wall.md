# Campaign: LED walls, stage lighting and sound — three bids

Owner (Lincoln, 2026-10-29): promote the big screen wall behind the stage (LED
wall / video wall), stage lighting and sound to churches. Say **we are United
Under God**, and that **we have three companies ready to bid for your work**.

| Piece | Where it lives |
|---|---|
| Cold email | ChurchConnect outreach, key `led_wall` (`backend/utils/service_outreach.py`) |
| Landing page | <https://www.unitedundergod.org/church-av/led-wall> (`src/lib/church-av-landing.ts`, slug `led-wall`) |
| Request form → bids | Posts a church need tagged `campaign='led-wall'` (`src/components/church-av-bids.tsx`) |
| Dashboard | <https://www.unitedundergod.org/admin/campaigns> (staff desk → Campaigns) |
| Bids and the church's choice | SOURCE desk → Needs, then the church's private page `/buying/need/<token>` |
| Campaign definition | `src/lib/campaigns.ts` (`LED_WALL`) |
| The same kit for any idea | AppEngine → Campaigns (`/campaigns`) |

## Status

Live since 2026-10-30 (owner: "we're not gonna wait for those three AV companies";
churches don't need to know the companies, we promote the products and the better
deal). The page and desk shipped in united-under-god #44; the email in ChurchConnect
#624, starting at 10 a weekday.

**Bidders:** add the companies on SOURCE as the first requests come in. Each signs
up at `/buying/sell-to-churches` (or is added on SOURCE → Vendors), accepts the
Vendor Terms, lists Audio-visual: systems and the states it serves (GA, FL, SC),
and is approved. The Campaigns desk shows "Ready to bid: N of 3" until there are
three; a request can wait on the desk until then.

## The emails

1. **First touch** — ChurchConnect outreach, weekdays 10 a.m.–4 p.m. Eastern,
   at most one email a church a month, from Lincoln Nunnally, United Under God.
   Goes to churches in South Georgia, Florida and South Carolina most likely to
   want an LED wall (owner, 2026-10-30: a livestream alone is not a sign). Points:
   a building or renovation campaign 3, modern praise music on the church's own
   website 3, a media director or several campuses 2, and 1 each for blended
   worship, a younger crowd, several services, five or more staff, or a large
   online audience; 3 points needed. Churches whose website reads traditional, or
   a liturgical or a cappella tradition, are left out. About 840 churches fit
   before the nightly worship scan reads their websites; best fit goes first.
   - Subject A: *An LED wall, lights and sound for your church, and a better deal on them*
   - Subject B: *Three companies are ready to bid on your church’s LED wall*
   - Picture: song words on an LED wall between LED panels, the band lit on stage
     (`/images/led-wall/email.jpg`, Unsplash).

   > Hello to the media and tech team at {church},
   >
   > We are United Under God. We help churches get **a better deal** on one of the
   > biggest purchases they make: an LED wall behind the stage, stage lighting and sound.
   >
   > What it does for your church on Sunday:
   > - Song lyrics and Scripture every seat can read, even in a bright room and from the back row
   > - A backdrop that sets the tone of worship, Sunday to Sunday and season to season
   > - Warm light on faces, so the preacher and the worship team are seen in the room and on the livestream
   > - Sound the whole room can sing with, on a board your volunteers can run
   >
   > How we help you get a better deal: you tell us about your room once, we write it
   > up as one clear project, and three companies ready to bid compete for that same
   > work. You compare the bids side by side on a private page and choose one, or none.
   > There's no obligation, and no company gets your contact details unless you choose it.
   >
   > **See what an LED wall could do for your church** → unitedundergod.org/church-av/led-wall
   >
   > P.S. Planning a building or renovation? Now is the best time to plan the wall, the
   > lights and the sound. Reply to this email or call me at (770) 317-7402.

   The email says "deal", never "price" (the church sound copy rules).

2. **Confirmation** — the moment a church sends the form, from this site.
   Subject: *We have your room: LED wall, lighting and sound*. Says we are United
   Under God, that we write one scope and three companies bid on it without
   seeing the church, and gives the church its private link.
3. **Bid invitations** — SOURCE desk, to each approved church AV company, when
   the desk starts the bid from the need.
4. **Your quotes are in** — SOURCE desk, to the church, when priced bids arrive.
5. **Introductions** — to the church and the chosen company, both ways, when the
   church chooses.

## Running it

- **Every morning:** open Campaigns. New requests sit under "New". On SOURCE →
  Needs, start a bid from each one (or add it to an open AV bid so several
  churches share one bid), and invite the three companies.
- **When the bids are in:** send the quotes to the church from the need.
- **Scale what works:** sends, opens, clicks and the A/B result live in
  ChurchConnect's outreach results. When a subject clearly wins with enough
  sends on each side, keep it as A and write a new B. Raise `led_wall_daily`
  when requests come in; the ramp already grows it on clean weekdays.

## Copy rules (enforced by tests)

No installer or partner name, no prices or dollar amounts, no "free", no "AI",
no ranking promises or guarantees, no claim that churches are legally required
to provide anything.

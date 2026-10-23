# Customer onboarding run 2026-10-23T10:15:57.662Z

Stops at payment on every app. Test accounts:

- Easy Peazy (easypeazy.site): qa-journey-ep-202610231015muy5@appengine.test
- AI Website Design: qa-journey-awd-202610231015muy5@appengine.test
- Easy Peazy (easypeazy.unitedundergod.org): qa-journey-uug-202610231015muy5@appengine.test
- ChurchConnect: qa-journey-cc-202610231015muy5@appengine.test
- Operate: qa-journey-operate-202610231015muy5@appengine.test
- Laser engraving: qa-journey-laser-202610231015muy5@mailinator.com

## easypeazy

- PASS open easypeazy.site — EasyPeazy - We Design Your Church or Business Website [easypeazy-01.png]
- PASS sign up — landed on the portal [easypeazy-02.png]
- PASS web address choices offered — easypeazy.site (free), vidalia.pro +$10/yr, vidalia.church +$10/yr, best-life.us +$10/yr, milstead.us +$10/yr, unitedundergod.org +$10/yr, we-succeed.org +$10/yr, backoffice.works +$10/yr
- PASS check an address is free — {"label":"qa-journey-231015muy5","host":"qa-journey-231015muy5.easypeazy.site","available":true,"message":null,"base":"easypeazy.site"}
- PASS claiming an address before paying is refused (402) — Choose your plan first — then we'll build your website.
- PASS build a free draft website (several minutes) — website status "draft" after 155s
- PASS dashboard shows the draft is ready — "Your draft is ready" with See my draft [easypeazy-07.png]
- PASS See my draft opens the draft — opened https://easypeazy.site/portal [ep-draft-preview.png] [easypeazy-08.png]
- PASS My Websites: publish needs payment (not clicked) — button "Pay $12 to publish" [easypeazy-09.png]

## easypeazy-uug

- PASS open easypeazy.unitedundergod.org — EasyPeazy - We Design Your Church or Business Website [easypeazy-uug-01.png]
- PASS sign up — landed on the portal [easypeazy-uug-02.png]
- PASS web address choices offered — easypeazy.site (free), vidalia.pro +$10/yr, vidalia.church +$10/yr, best-life.us +$10/yr, milstead.us +$10/yr, unitedundergod.org +$10/yr, we-succeed.org +$10/yr, backoffice.works +$10/yr
- PASS check an address is free — {"label":"qa-journey-231015muy5","host":"qa-journey-231015muy5.easypeazy.site","available":true,"message":null,"base":"easypeazy.site"}
- PASS claiming an address before paying is refused (402) — Choose your plan first — then we'll build your website.
- PASS build a free draft website (several minutes) — website status "draft" after 144s
- PASS dashboard shows the draft is ready — "Your draft is ready" with See my draft [easypeazy-uug-07.png]
- PASS See my draft opens the draft — opened https://easypeazy.unitedundergod.org/portal [uug-draft-preview.png] [easypeazy-uug-08.png]
- PASS My Websites: publish needs payment (not clicked) — button "Pay $12 to publish" [easypeazy-uug-09.png]

## ai-website-design

- PASS open ai-website.design — AI Website Design — Describe it. We design it. It goes live. [ai-website-design-01.png]
- PASS sign up — https://ai-website.design/dashboard [ai-website-design-02.png]
- PASS describe the business and generate a site — editor for site 31f37579-e629-4c8f-839d-ff8c0c133f14 [ai-website-design-03.png]
- PASS editor: Go live and web address choice — Go live — $50 + $19/mo (not clicked: opens payment); address choices: southern-roots-bakery.ai-website.design (included) | southern-roots-bakery.vidalia.pro (+$0.84/mo, about $10 a year) · For Vidalia area business including contractors and service providers | southern-roots-bakery.vidalia.church (+$0.84/mo, about $10 a year) · For Vidalia area churches | southern-roots-bakery.best-life.us (+$0.84/mo, about $10 a year) · For organizations that provide services and products to help people improve thei | southern-roots-bakery.milstead.us (+$0.84/mo, about $10 a year) · For people or organizations in Milstead | southern-roots-bakery.unitedundergod.org (+$0.84/mo, about $10 a year) · For Christian organizations | southern-roots-bakery.we-succeed.org (+$0.84/mo, about $10 a year) · For team players who work to help the people around them | southern-roots-bakery.backoffice.works (+$0.84/mo, about $10 a year) · For organizations helping businesses operate their office [ai-website-design-04.png]
- PASS publishing before paying is refused (402) — 402 payment required
- PASS clean up the test site — delete → 200

## churchconnect

- PASS open churchconnect.cloud — ChurchConnect — church software for people, events, and Sunday communication [churchconnect-01.png]
- PASS church sign up — signed in and on the app [churchconnect-02.png]
- PASS after sign-up: mobile number prompt (skipped with Remind me later) — no prompt [churchconnect-03.png]
- PASS first-run setup checklist — no setup checklist text found [churchconnect-04.png]
- PASS church invite /for/{slug} — skipped: no invite link given yet (needs a super-admin to prepare one)

## churchconnect-invite

- PASS church invite /for/{slug} — skipped: no invite link given yet (needs a super-admin to prepare one)

## operate

- PASS open Operate — Operate — see the week. Run the shop. Keep more of what you earn. [operate-01.png]
- PASS new shop sign up — on the desk [operate-02.png]
- PASS desk first-run cards — Add your first person: true, Record the first dollar: true, recovery code: true [operate-03.png]
- PASS Get More Work messages — 1. Go to business.google.com and search for QA Journey Lawn Care in Vidalia. Claim it, or add it if it is not there.
2. Add 5 to 10 clear photos of your work, your shop or your team.
3. List what you  [operate-04.png]
- PASS website page — Build my website offered [operate-05.png]
- PASS Build my website → Easy Peazy sign-in hop — arrived at https://easypeazy.site/portal [operate-06.png]
- PASS Operate shop sees its web address choices on Easy Peazy — easypeazy.site, vidalia.pro, best-life.us, milstead.us, unitedundergod.org, we-succeed.org, backoffice.works

## laser

- PASS church page /ccvidalia — Connection Church Vidalia: "Your church's logo, on gifts people keep." · 3 pieces [laser-01.png]
- PASS /connection goes to the Connection page — https://laser.engrave.market/connection → 307
- PASS /fbcv page — live: FBC Vidalia [laser-03.png]
- PASS 'Save this page' form is there (not submitted) — form shown [laser-04.png]
- PASS order a piece → checkout (stopped before Pay) — total $32.00; button "Pay $32.00" (not clicked) [laser-05.png]
- PASS buyer account sign up — https://laser.engrave.market/account [laser-06.png]

## united-under-god

- PASS apps page lists the web services — EasyPeazy: true, AI Website Design: true, Operate: true [united-under-god-01.png]
- PASS link answers: https://easypeazy.unitedundergod.org/ — https://easypeazy.unitedundergod.org/ → 200
- PASS link answers: https://ai-website.design/ — https://ai-website.design/ → 200
- PASS link answers: https://operate.unitedundergod.org/ — https://operate.unitedundergod.org/ → 200

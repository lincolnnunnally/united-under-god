# Customer onboarding run 2026-10-22T16:21:16.033Z

Stops at payment on every app. Test accounts:

- Easy Peazy (easypeazy.unitedundergod.org): qa-journey-uug-202610221621ae13@appengine.test
- Easy Peazy (easypeazy.site): qa-journey-ep-202610221621ae13@appengine.test
- AI Website Design: qa-journey-awd-202610221621ae13@appengine.test
- ChurchConnect: qa-journey-cc-202610221621ae13@appengine.test
- Operate: qa-journey-operate-202610221621ae13@appengine.test
- Laser engraving: qa-journey-laser-202610221621ae13@appengine.test

## easypeazy

- PASS open easypeazy.site — EasyPeazy - We Design Your Church or Business Website [easypeazy-01.png]
- PASS sign up — landed on the portal [easypeazy-02.png]
- PASS web address choices offered — easypeazy.site (free)
- PASS check an address is free — {"label":"qa-journey-221621ae13","host":"qa-journey-221621ae13.easypeazy.site","available":true,"message":null,"base":"easypeazy.site"}
- PASS claiming an address before paying is refused (402) — Choose your plan first — then we'll build your website.
- FAIL build a free draft website (several minutes) — apiRequestContext.fetch: read ETIMEDOUT
- FAIL portal shows the draft — locator.waitFor: Timeout 30000ms exceeded. [easypeazy-07.png]
- PASS draft preview opens — no preview button [easypeazy-08.png]

## easypeazy-uug

- PASS open easypeazy.unitedundergod.org — EasyPeazy - We Design Your Church or Business Website [easypeazy-uug-01.png]
- PASS sign up — landed on the portal [easypeazy-uug-02.png]
- PASS web address choices offered — easypeazy.site (free)
- PASS check an address is free — {"label":"qa-journey-221621ae13","host":"qa-journey-221621ae13.easypeazy.site","available":true,"message":null,"base":"easypeazy.site"}
- PASS claiming an address before paying is refused (402) — Choose your plan first — then we'll build your website.
- PASS build a free draft website (several minutes) — draft built in 164s
- FAIL portal shows the draft — locator.waitFor: Timeout 30000ms exceeded. [easypeazy-uug-07.png]
- PASS draft preview opens — no preview button [easypeazy-uug-08.png]

## ai-website-design

- PASS open ai-website.design — AI Website Design — Describe it. We design it. It goes live. [ai-website-design-01.png]
- PASS sign up — https://ai-website.design/dashboard [ai-website-design-02.png]
- PASS describe the business and generate a site — editor for site 9dc5fe7d-fe08-4e81-8127-74259828986c [ai-website-design-03.png]
- PASS editor: Go live and web address choice — Go live — $50 + $19/mo (not clicked: opens payment); address choices: free address only (no shared domains listed yet) [ai-website-design-04.png]
- PASS publishing before paying is refused (402) — 402 payment required
- PASS clean up the test site — delete → 200

## churchconnect

- PASS open churchconnect.cloud — ChurchConnect — church software for people, events, and Sunday communication [churchconnect-01.png]
- PASS church sign up — signed in and on the app [churchconnect-02.png]
- PASS first-run setup checklist — no setup checklist text found [churchconnect-03.png]
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
- PASS Operate shop sees its web address choices on Easy Peazy — easypeazy.site

## laser

- PASS church page /ccvidalia — Connection Church Vidalia: "Gifts your church can hand out and keep: welcome coasters for first-time guests, boards and wall pieces to thank volunteers, honor teachers " · 3 pieces [laser-01.png]
- PASS /connection goes to the Connection page — https://laser.engrave.market/connection → 307
- PASS /fbcv page — not created yet (shows 'That page isn't here') [laser-03.png]
- PASS 'Save this page' form is there (not submitted) — form shown [laser-04.png]
- PASS order a piece → checkout (stopped before Pay) — total $32.00; button "Pay $32.00" (not clicked) [laser-05.png]
- PASS buyer account sign up — https://laser.engrave.market/signin [laser-06.png]

## united-under-god

- PASS apps page lists the web services — EasyPeazy: true, AI Website Design: true, Operate: true [united-under-god-01.png]
- PASS link answers: https://easypeazy.unitedundergod.org/ — https://easypeazy.unitedundergod.org/ → 200
- PASS link answers: https://ai-website.design/ — https://ai-website.design/ → 200
- PASS link answers: https://operate.unitedundergod.org/ — https://operate.unitedundergod.org/ → 200

# Customer onboarding run 2026-10-22T17:28:45.598Z

Stops at payment on every app. Test accounts:

- Laser engraving: qa-journey-laser-2026102217284ek6@mailinator.com

## site-assets

- PASS fsg: open https://shadygroveconyers.org/ — Shady Grove Baptist Church Conyers Ga Where Love Makes a Difference [site-assets-01.png]
- PASS fsg: logo and colors — 0 logo candidates, 2 downloaded; header rgba(0, 0, 0, 0); button  [site-assets-02.png]
- FAIL milstead: open https://www.milsteadbaptist.org/ — page.goto: net::ERR_NAME_NOT_RESOLVED at https://www.milsteadbaptist.org/ [site-assets-03.png]
- PASS milstead: logo and colors — 0 logo candidates, 0 downloaded; header ; button  [site-assets-04.png]

## laser

- PASS church page /ccvidalia — Connection Church Vidalia: "Your church's logo, on gifts people keep." · 3 pieces [laser-01.png]
- PASS /connection goes to the Connection page — https://laser.engrave.market/connection → 307
- PASS /fbcv page — live: FBC Vidalia [laser-03.png]
- PASS 'Save this page' form is there (not submitted) — form shown [laser-04.png]
- PASS order a piece → checkout (stopped before Pay) — total $32.00; button "Pay $32.00" (not clicked) [laser-05.png]
- PASS buyer account sign up — https://laser.engrave.market/account [laser-06.png]

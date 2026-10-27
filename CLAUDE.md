# EICR in London website

Website for EICR in London (Group Tech Solutions UK Ltd): electrical, gas, fire and energy certificates across London.

## Structure

- Only `web/` is the site: Next.js 15 (App Router, React 19, TypeScript). There is no other app in the repo.
- Hosted on Vercel with Root Directory `web`. Every push to `main` deploys to production automatically; other branches get preview deploys. The Vercel result shows as a commit status (context "Vercel"), not a check run.
- `web/content/`: HTML partials from the old WordPress theme (`header.html`, `footer.html`, `pages/*.html`) plus `meta.json`. `home.html` uses `{{key}}` price tokens and `[[key]]` text tokens filled from admin settings.
- `web/public/`: `css/`, `js/`, `images/`. Every `/css` and `/js` link must carry `?v=ASSET_VERSION` (1-year immutable cache). Images cache for 30 days, so use a new filename when replacing one.
- `web/app/`: pages (`[slug]`, `services`, `areas`, `guides`, `booking`, `pricing`, `request-a-quote`, `admin`) and API routes (`api/checkout`, `api/forms`, `api/reviews`, `api/stripe-webhook`).

## Key libs (`web/lib/`)

- `booking.ts`, `pricing.ts`, `slots.ts`, `bookings.ts`: booking wizard pricing and payment mode. `paymentMode()`: no `STRIPE_SECRET_KEY` = demo card payment, `BOOKING_REQUEST_ONLY=1` = email-only, key set = Stripe Checkout. Cash and bank bookings are always emailed. Bookings are saved to Blob `bookings/<id>.json`.
- `admin.ts`, `adminCookie.ts`, `settings.ts`, `siteText.ts`: hidden `/admin/` panel (password login, settings as one JSON in Blob `admin/settings.json`). Keep admin unlinked, noindex and out of robots.txt and the sitemap.
- `reviews.ts`: customer reviews saved to Blob `reviews/pending/`, approved in admin, shown on the home page.
- `invoice.ts`, `email.ts`: branded customer invoice and team emails through Resend.
- `areas.ts`, `guides.ts`, `services.ts`, `serviceDetails.ts`: area pages, guides and service pages.
- `content.ts`, `site.ts`: partial loading and business details. Use `getSite()` and `renderPartial()` so admin contact details apply.

## Environment variables (set in Vercel, never in code or chat)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOOKING_REQUEST_ONLY`, `RESEND_API_KEY`, `FORM_TO_EMAIL`, `FORM_FROM_EMAIL`, `INVOICE_FROM_EMAIL`, `BANK_DETAILS`, `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_LABEL`, `NEXT_PUBLIC_GOOGLE_REVIEW_URL`. See `web/.env.example`. The site builds and runs without any of them.

## Commands (run in `web/`)

- `npm install`
- `npm run dev`: local server
- `npm run lint`
- `npm run build`: the main check; there is no test suite. Run lint and build before every PR.

## Working rules from Usman (the owner)

- Reply to Usman in simple Bengali.
- Minimal, compact design. No AI-sounding, demo or placeholder copy, no helper or instruction text, no "coming soon".
- No unnecessary code comments.
- Never add fake reviews, made-up review counts or invented numbers or prices. Use only figures Usman gives.
- Do not add "inc. VAT" after prices or totals on the site. Do not write "no hidden charges".
- Show all six accreditation logos (NICEIC, Gas Safe, NAPIT, TrustMark, Elmhurst Energy, City & Guilds). Registration numbers stay discreet: never in the hero.
- Work on a branch and open a PR, then merge it to `main` (live) once lint and build pass and the Vercel preview deploys. Usman does not need to be asked first.
- Work efficiently: no screenshots, videos or generated images unless Usman asks; check with lint and build. Keep replies short.

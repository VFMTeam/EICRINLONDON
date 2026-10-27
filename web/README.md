# EICR in London website

The new website, built with Next.js. It replaces the old WordPress site and
keeps the same design and page addresses.

Every page is pre-built as plain HTML and served from Vercel's worldwide
network, so it loads quickly. There are no plugins to update and no database
to hack. Card payments will run on Stripe's own secure payment page, so card
details never touch this website.

## What you need (and roughly what it costs)

Check each provider's current prices before you sign up.

| What | Provider | Cost | Why |
| --- | --- | --- | --- |
| Domain | Keep `eicrinlondon.co.uk` where it is now, or buy it at Cloudflare or Namecheap | about £5–10 a year | Your web address |
| Hosting | [Vercel](https://vercel.com), **Pro plan** | about $20 a month | Fast hosting with free HTTPS. The free Hobby plan is not allowed for business sites. |
| Email sending | [Resend](https://resend.com) | free for up to 3,000 emails a month | Sends quote requests and booking emails |
| Payments | [Stripe](https://stripe.com/gb) | no monthly fee, a small fee per payment | Card, Apple Pay and Google Pay on Stripe's secure page |
| Database (phase 2) | [Supabase](https://supabase.com), London region | free to start, about $25 a month later | Stores bookings and payment records |

## Put the site online (step by step)

1. **Create a Vercel account.** Go to vercel.com, choose *Sign up*, then *Continue with GitHub*, and use the GitHub account that owns this repository.
2. **Import the project.** Choose *Add New → Project*, pick `EICRINLONDON`, and set **Root Directory** to `web`. Leave the other settings as they are.
3. **Add the settings.** Under *Environment Variables*, add each line from `.env.example` with your own values. Leave `RESEND_API_KEY` empty until step 5.
4. **Deploy.** Choose *Deploy*. After about a minute you get a working address such as `eicrinlondon.vercel.app`. Open it and check the site.
5. **Connect email.**
   1. Sign up at resend.com and choose *Domains → Add domain* with `eicrinlondon.co.uk`.
   2. Add the DNS records Resend shows you at your domain provider.
   3. Create an API key, paste it into Vercel as `RESEND_API_KEY`, and redeploy.
   4. Send yourself a test quote from the *Request a Quote* page.
6. **Connect your domain.**
   1. In Vercel, open *Project → Settings → Domains* and add `www.eicrinlondon.co.uk` and `eicrinlondon.co.uk`.
   2. Vercel shows one or two DNS records. Add them at your domain provider (the old WordPress host's records are replaced).
   3. HTTPS turns on automatically within minutes.

From then on, every change pushed to GitHub goes live automatically. Each
branch also gets its own preview address, so changes can be checked before
they go live.

## Card payments with Stripe

Online bookings are paid on Stripe's own secure Checkout page. To turn it on:

1. In Stripe, open *Developers → API keys* and copy the **Secret key**. Add it
   in Vercel as `STRIPE_SECRET_KEY`. Use the `sk_test_…` key first, and switch
   to `sk_live_…` once a test booking works.
2. In Stripe, open *Developers → Webhooks → Add endpoint*. Use
   `https://www.eicrinlondon.co.uk/api/stripe-webhook/` (keep the slash at the
   end) and choose the events `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`.
3. Copy the endpoint's **Signing secret** (`whsec_…`) into Vercel as
   `STRIPE_WEBHOOK_SECRET`, then redeploy.
4. Make a test booking with card 4242 4242 4242 4242. You get a "Paid booking"
   email at `FORM_TO_EMAIL`. If the email can't be sent, Stripe tries again
   for up to three days.
5. Customers also get an invoice by email from the site itself (logo,
   services, total inc. VAT and how they pay) for card, cash and bank
   transfer bookings. It goes through Resend, so it is free. Put your bank
   details in Vercel as `BANK_DETAILS` so they show on bank transfer invoices.
   Invoices come from `INVOICE_FROM_EMAIL` (default info@eicrinlondon.co.uk),
   so that domain must be verified in Resend (see "Connect email" above).

Test mode and live mode in Stripe each have their own keys and webhook, so
repeat steps 1 to 3 when you switch to live.

## Cookie banner and Google Ads

The site has its own cookie banner (`components/CookieConsent.tsx`) that uses
Google Consent Mode v2, which Google requires for running ads to UK visitors.
Google tags only load after a visitor accepts, as UK law requires, and
"Reject all" is as easy to choose as "Accept all".

To start measuring your Google Ads:

1. In Google Ads, open *Goals → Conversions → New conversion action → Website*,
   create one called "Quote request" and choose *Use Google tag*.
2. Copy the tag ID (`AW-…`) and the conversion label into Vercel as
   `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_GOOGLE_ADS_LABEL`. Optionally
   add a Google Analytics ID as `NEXT_PUBLIC_GA_ID`. Then redeploy.
3. Calls, emails, WhatsApp clicks and quote requests are then reported
   automatically. Quote requests count as Google Ads conversions.
4. In your ad campaign, use `https://www.eicrinlondon.co.uk/` (or a service
   page such as `/services/eicr-certificate/`) as the landing page.

## Editing content

- Business phone, email and address: `lib/site.ts`
- Services, prices and service descriptions: `lib/services.ts`
- Home, About, Areas, Contact, legal pages: `content/pages/*.html`
- Header menu and footer: `content/header.html`, `content/footer.html`
- Images: `public/images/`

## Running it on a computer

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # open http://localhost:3000
```

## Roadmap

- **Phase 1 (done):** all public pages, fast static site, quote form by email, security headers, sitemap, old WordPress addresses redirected.
- **Phase 2:** online booking with Stripe Checkout payments (no customer sign-in needed) and an owner admin for orders and prices.

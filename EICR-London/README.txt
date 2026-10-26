EICR IN LONDON WORDPRESS THEME v4.9.5

INSTALL
1. WordPress Admin > Appearance > Themes > Add New > Upload Theme.
2. Upload the theme ZIP and activate it.
3. Appearance > Menus: assign a Primary menu.
4. EICR Admin > Business & Contact: enter the company details.
   Add only verified professional registration references; blank credentials are hidden.
5. EICR Admin > Colours & Style: control the shared website palette, including text, backgrounds, booking and payment sections.
6. EICR Admin > Prices & Discounts: edit live service prices and discounts.
7. Services: edit titles, descriptions and featured images.
8. Booking and Request a Quote pages are created on activation.

CUSTOMER ACCOUNTS + CERTIFICATES
- Separate WordPress pages are created automatically: /sign-in/, /create-account/, /reset-password/ and /my-account/.
- Visitors can browse the home page, every service and all public information without signing in.
- Public pages keep the same header, spacing, content and responsive layout before and after customer sign-in; only the Account control changes to the customer's profile and management links.
- Desktop uses a circular customer profile icon with an account/logout hover menu. Mobile keeps Account inside the navigation only.
- My Account uses an app-style workspace with separate Overview, Bookings, Certificates and Profile views, plus a mobile bottom navigation bar.
- Profile includes a prominent photo uploader and preview together with name, phone, address, postcode, contact preference, reminders and password controls. Logout remains the final Profile action on mobile.
- The desktop profile hover menu contains only Account overview, Certificates and Sign out.
- A first certificate download unlocks an in-account review request and thank-you prompt. After that customer submits any review, certificate downloads no longer prompt them; voluntary homepage reviews remain available.
- Google sign-in stores the verified Google profile image locally unless the customer has chosen a custom photo.
- Opening /booking/ or any Book Now link requires a customer login, then returns the customer to the selected booking.
- Account creation asks for full name, email, password and a single-use built-in CAPTCHA, then sends a required verification link before any booking history is linked.
- Sign In asks for email and password. Create New Account opens the separate registration page, and Forgot Password uses the branded reset screen.
- Configure Google, Apple, Facebook and/or Microsoft credentials in EICR Admin > Social Login Setup. The status screen shows which providers are Ready, their exact callback URLs and the last sign-in error. Only Ready providers appear publicly.
- EICR Admin > Test Customer creates or resets an isolated test customer and shows its generated password once.
- Open EICR Admin > Orders, edit a booking, and use Customer certificates & job completion to choose a service and upload its PDF.
- For multiple-service bookings, the job becomes Completed only when every selected service has a PDF.
- When every PDF is uploaded and payment is confirmed, the customer receives a Job complete email with a link to the secure dashboard.
- PDFs are stored outside the public web root when the host permits it, served through an authenticated download, and released to the customer only after payment is confirmed.

STAFF OPERATIONS PORTAL
- Separate WordPress pages are created automatically at /staff-login/, /staff-verify/ and /staff-dashboard/.
- The owner creates or disables the shared operations account in EICR Admin > Staff Accounts. One account can be used from up to five owner-approved browsers.
- Staff can use the private /staff-login/ address or enter the staff email and password on customer Sign In. A new browser must enter a six-digit code sent only to the WordPress Administration Email; the code expires after 10 minutes.
- The owner can revoke every trusted staff browser from EICR Admin > Staff Accounts. Password reset or account deactivation also revokes trusted browsers.
- Staff enter the appointment details and choose Done — Confirm booking. The customer dashboard then shows Booking Confirmed in booking tracking.
- Staff use the private Staff Login page; they cannot access WordPress admin, public service pages or owner settings.
- Staff can view bookings, customer contact details, property addresses, selected services, dates and customer notes.
- Staff can update appointment details and internal work notes, upload/replace certificate PDFs, complete multi-service jobs, mark quotes handled, and publish or unpublish genuine customer reviews.
- Staff never see booking amounts, payment methods, Stripe data, prices, colours, tracking or business settings.
- Owner-only payment records are shown in EICR Admin > Payment Overview. Payment, Stripe, price and colour settings remain in WordPress.

REVIEWS
- New public submissions are saved as Pending and never appear automatically.
- Open EICR Admin > Reviews and publish only genuine customer feedback.
- The newest published review appears first and the published review total updates automatically.
- The earlier website review count remains owner data only and is not displayed to customers.

PAYMENTS + INVOICES
- Enter Stripe keys in EICR Admin > Payments & Stripe.
- Create Stripe webhook: /wp-json/eicr/v1/stripe-webhook
- Select the payment_intent.succeeded event.
- Copy its signing secret into EICR Admin > Payments & Stripe.
- Successful Stripe payment marks the order Paid and emails a receipt.
- Bank and cash bookings can be marked Paid only by the owner in EICR Admin > Payment Overview; this releases completed PDFs to the customer.
- Install FluentSMTP or WP Mail SMTP free and connect Gmail/Google Workspace for reliable delivery.

GOOGLE ADS CAMPAIGNS
- This theme does not contain AdSense, ad units, Auto Ads, advertising space or an ads.txt endpoint.
- To bring visitors from Google Ads, create the campaign in Google Ads and use this website as the landing-page URL.
- Optional conversion measurement remains under EICR Admin > SEO & Campaign Tracking.
- Google Analytics and Google Ads measurement tags require an appropriate UK consent setup when enabled.

FREE-FIRST PLUGINS
- FluentSMTP or WP Mail SMTP: reliable email
- Rank Math SEO or Yoast SEO: advanced page SEO
- A suitable consent platform if optional Analytics or Google Ads measurement is enabled
- UpdraftPlus: backups
- Wordfence: security

TEST MODE
Use Stripe test keys and test card 4242 4242 4242 4242. Never use live keys until HTTPS and webhook are confirmed.

BEFORE PUBLICATION
- Enter the legal business name, privacy contact and any company/ICO details that apply.
- Review the generated Privacy Policy, Cookie Policy and Terms for the actual business.
- Create one test staff account and confirm a new browser receives the owner verification challenge, can use only /staff-dashboard/, cannot open /wp-admin/ or public service pages, and cannot see payment values.
- Test customer email verification, Sign In/Create Account, branded password reset, CAPTCHA, booking, every payment method, staff certificate upload, owner payment confirmation, customer download and completion email on HTTPS.
- Test each configured connected provider on HTTPS after registering the exact callback URL shown in EICR Admin > Social Login Setup.
- Publish only genuine reviews and only credentials the business can evidence.

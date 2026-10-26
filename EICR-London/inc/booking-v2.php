<?php
if (!defined("ABSPATH")) {
    exit();
}
function eicr_booking_service_sets()
{
    return [
        "residential" => [
            "eicr-certificate" => "EICR – Electrical Certificate",
            "gas-safety" => "Gas Safety Certificate",
            "epc" => "Energy Performance Certificate",
            "pat-testing" => "PAT Testing",
            "fuse-box-installation" => "Fuse Box Installation & Replacement",
            "fire-alarm-certificate" =>
                "Fire Alarm Panel Service & Certification",
            "fire-risk" => "Fire Risk Assessment",
            "emergency-lighting" => "Emergency Lighting Certificate",
            "smoke-detector-certificate" => "Smoke Detector Certificate",
            "fire-extinguisher-check" => "Fire Extinguisher Check",
            "asbestos-survey" => "Asbestos Survey",
            "health-safety-service" => "Health & Safety Service",
            "boiler-service" => "Boiler Service",
            "boiler-gas-safety-combo" =>
                "Boiler Service + Gas Safety Certificate (2 Appliances)",
        ],
        "commercial" => [
            "commercial-eicr" => "EICR – Electrical Certificate",
            "gas-safety" => "Gas Safety Certificate",
            "epc" => "Energy Performance Certificate",
            "pat-testing" => "PAT Testing",
            "fuse-box-installation" => "Fuse Box Installation & Replacement",
            "fire-alarm-certificate" =>
                "Fire Alarm Panel Service & Certification",
            "fire-risk" => "Fire Risk Assessment",
            "emergency-lighting" => "Emergency Lighting Certificate",
            "smoke-detector-certificate" => "Smoke Detector Certificate",
            "fire-extinguisher-check" => "Fire Extinguisher Check",
            "asbestos-survey" => "Asbestos Survey",
            "health-safety-service" => "Health & Safety Service",
            "boiler-service" => "Boiler Service",
        ],
    ];
}
function eicr_booking_service_by_slug($slug)
{
    return get_page_by_path(sanitize_title($slug), OBJECT, "eicr_service");
}
function eicr_booking_price(
    $service,
    $kind,
    $bedrooms = 0,
    $floors = 1,
    $commercial_type = "other",
) {
    $base = (float) get_post_meta($service->ID, "_eicr_price", true);
    $slug = $service->post_name;
    $bedrooms = absint($bedrooms);
    $floors = max(1, absint($floors));
    if ($kind === "residential") {
        if ($slug === "eicr-certificate") {
            $base +=
                $bedrooms <= 0
                    ? 0
                    : ($bedrooms <= 2
                        ? 20
                        : ($bedrooms <= 4
                            ? 40
                            : 70));
        } elseif ($slug === "epc") {
            $base +=
                $bedrooms <= 3
                    ? 0
                    : ($bedrooms === 4
                        ? 10
                        : ($bedrooms === 5
                            ? 20
                            : 30));
        } elseif ($slug === "asbestos-survey") {
            $base += $bedrooms <= 2 ? 0 : ($bedrooms <= 5 ? 50 : 100);
        } elseif ($slug === "fire-risk") {
            $base += max(0, $floors - 1) * 20 + max(0, $bedrooms - 2) * 10;
        }
        return round($base, 2);
    }
    $commercial = (float) get_post_meta(
        $service->ID,
        "_eicr_commercial_price",
        true,
    );
    if ($commercial <= 0) {
        $minimum = [
            "commercial-eicr" => 345,
            "fire-risk" => 159,
            "asbestos-survey" => 249,
            "fuse-box-installation" => 350,
        ];
        $commercial = max($base, $minimum[$slug] ?? $base);
    }
    $factors = [
        "shop" => 1,
        "office" => 1.1,
        "pub-restaurant" => 1.2,
        "warehouse" => 1.35,
        "other" => 1.1,
    ];
    return round(
        $commercial * ($factors[sanitize_key($commercial_type)] ?? 1.1),
        2,
    );
}
function eicr_booking_v2()
{
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user()) {
        return '<div class="eicr-booking-login-required"><a href="' . esc_url(eicr_customer_booking_login_url(eicr_customer_booking_url(sanitize_title(wp_unslash($_GET["service"] ?? ""))))) . '">Continue to Sign In</a></div>';
    }
    ob_start();
    $sets = eicr_booking_service_sets();
    $preselect = sanitize_title($_GET["service"] ?? "eicr-certificate");
    $booking_user = wp_get_current_user();
    $booking_first_name = sanitize_text_field((string) get_user_meta($booking_user->ID, "first_name", true));
    $booking_last_name = sanitize_text_field((string) get_user_meta($booking_user->ID, "last_name", true));
    if ($booking_first_name === "" && $booking_last_name === "") {
        $name_parts = preg_split('/\s+/', trim((string) $booking_user->display_name), 2);
        $booking_first_name = sanitize_text_field($name_parts[0] ?? "");
        $booking_last_name = sanitize_text_field($name_parts[1] ?? "");
    }
    $booking_phone = function_exists("eicr_customer_setting_value") ? eicr_customer_setting_value($booking_user->ID, "phone") : "";
    $booking_address = function_exists("eicr_customer_setting_value") ? eicr_customer_setting_value($booking_user->ID, "address") : "";
    $booking_postcode = function_exists("eicr_customer_setting_value") ? eicr_customer_setting_value($booking_user->ID, "postcode") : "";
    ?>
<div class="booking-compact min-h-screen bg-gradient-to-b from-amber-50 via-mist to-white px-3 py-6 sm:px-4">
<form data-booking-v2 class="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,.35)]">
<header class="relative overflow-hidden bg-ink p-5 text-white sm:p-6">
<div class="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-gold/10">
</div>
<div class="relative">
<p class="text-xs font-black uppercase tracking-[.2em] text-gold">London inspection request</p>
<h1 data-booking-title class="mt-1 text-2xl font-black sm:text-3xl">Build your property booking</h1>
<p data-booking-copy class="mt-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm">Tell us about the premises, add the required checks and choose a preferred visit window.</p>
</div>
</header>
<div class="p-4 sm:p-5">
<div data-part="1">
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
<label>
<span class="label">Booking for</span>
<select class="field" name="property_kind">
<option value="residential">Residential</option>
<option value="commercial">Commercial</option>
</select>
</label>
<label data-residential-fields>
<span class="label">Bedroom count</span>
<select class="field" name="bedrooms">
<option value="0">Studio Flat</option>
<?php for (
    $i = 1;
    $i <= 6;
    $i++
): ?>
<option value="<?php echo $i; ?>">
<?php echo $i; ?> Bedroom<?php echo $i >
 1
     ? "s"
     : ""; ?>
</option>
<?php endfor; ?>
</select>
</label>
<label data-residential-fields>
<span class="label">Number of storeys</span>
<select class="field" name="floors">
<?php for (
    $i = 1;
    $i <= 5;
    $i++
): ?>
<option value="<?php echo $i; ?>">
<?php echo $i; ?>
</option>
<?php endfor; ?>
</select>
</label>
<label data-commercial-fields hidden>
<span class="label">Commercial premises category</span>
<select class="field" name="commercial_type">
<option value="pub-restaurant">Pub/Restaurant</option>
<option value="shop">Shop</option>
<option value="warehouse">Warehouse</option>
<option value="office">Office</option>
<option value="other">Other</option>
</select>
</label>
</div>
<?php foreach (
    $sets
    as $kind => $items
): ?>
<section data-service-set="<?php echo esc_attr(
    $kind,
); ?>" class="mt-5" <?php echo $kind === "commercial"
    ? "hidden"
    : ""; ?>>
<p class="text-sm font-bold text-muted">Available checks for this <?php echo esc_html(
    $kind,
); ?> property</p>
<div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
<?php foreach (
     $items
     as $slug => $label
 ):

     $s = eicr_booking_service_by_slug($slug);
     if (!$s) {
         continue;
     }
     $base = eicr_booking_price($s, $kind, 0, 1, "shop");
     $checked =
         $preselect === $slug ||
         ($preselect === "eicr-certificate" && $slug === "commercial-eicr");
     ?>
<label class="service-option flex cursor-pointer gap-2 rounded-xl border border-line bg-white p-2.5">
<input type="checkbox" name="service_ids[]" value="<?php echo esc_attr(
    $s->ID,
); ?>" data-slug="<?php echo esc_attr(
    $slug,
); ?>" data-kind="<?php echo esc_attr(
    $kind,
); ?>" data-base="<?php echo esc_attr($base); ?>" <?php checked(
    $checked && $kind === "residential",
); ?>>
<span class="min-w-0">
<b class="block text-xs leading-4 sm:text-sm sm:leading-5">
<?php echo esc_html(
    $label,
); ?>
</b>
<small data-price-label class="text-xs font-semibold">From £<?php echo number_format(
    $base,
    2,
); ?>
</small>
</span>
</label>
<?php
 endforeach; ?>
</div>
</section>
<?php endforeach; ?>
<section class="mt-5 rounded-2xl border border-line bg-white p-4">
<h2 class="text-lg font-black">Preferred visit</h2>
<div class="mt-3 grid gap-3 sm:grid-cols-2">
<label>
<span class="label">Preferred date</span>
<input class="field" type="date" name="date" min="<?php echo esc_attr(
    current_time("Y-m-d"),
); ?>" required>
</label>
<label>
<span class="label">Arrival window</span>
<select class="field" name="time_slot">
<option value="morning">08:00 AM – 01:00 PM</option>
<option value="afternoon">01:00 PM – 06:00 PM</option>
</select>
</label>
</div>
</section>
</div>
<div data-part="2" hidden class="grid gap-4">
<section class="rounded-2xl border border-line bg-white p-4 sm:p-5">
<h2 class="text-lg font-black">Who should we contact?</h2>
<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
<label>
<span class="label">First Name</span>
<input class="field" name="first_name" value="<?php echo esc_attr($booking_first_name); ?>" autocomplete="given-name" required>
</label>
<label>
<span class="label">Last Name</span>
<input class="field" name="last_name" value="<?php echo esc_attr($booking_last_name); ?>" autocomplete="family-name" required>
</label>
<label>
<span class="label">Email</span>
<input class="field" type="email" name="email" value="<?php echo esc_attr($booking_user->user_email); ?>" readonly required>
<small>This booking will be linked to your customer account.</small>
</label>
<label>
<span class="label">Phone</span>
<input class="field" type="tel" name="phone" value="<?php echo esc_attr($booking_phone); ?>" autocomplete="tel" required>
</label>
</div>
</section>
<section class="rounded-2xl border border-line bg-white p-4 sm:p-5">
<h2 class="text-lg font-black">Where is the work required?</h2>
<div class="mt-3 grid gap-3 md:grid-cols-2">
<label>
<span class="label">Street Address</span>
<input class="field" name="address" value="<?php echo esc_attr($booking_address); ?>" autocomplete="street-address" required>
</label>
<label>
<span class="label">Post Code</span>
<input class="field" name="postcode" value="<?php echo esc_attr($booking_postcode); ?>" autocomplete="postal-code" required>
</label>
<fieldset>
<legend class="label">Parking at the address</legend>
<div class="grid gap-2">
<label class="booking-radio">
<input type="radio" name="parking" value="0">
<span>Free parking can be provided</span>
</label>
<label class="booking-radio">
<input type="radio" name="parking" value="5">
<span>Paid parking nearby – add £5.00</span>
</label>
<label class="booking-radio">
<input type="radio" name="parking" value="5">
<span>No allocated parking – add £5.00</span>
</label>
</div>
<small>The £5.00 allowance contributes to paid parking or access where free parking is unavailable. Any higher verified parking cost is agreed before final settlement.</small>
</fieldset>
<fieldset>
<legend class="label">London congestion charge</legend>
<div class="grid gap-2">
<label class="booking-radio">
<input type="radio" name="congestion" value="0">
<span>No</span>
</label>
<label class="booking-radio">
<input type="radio" name="congestion" value="18">
<span>Yes – £18.00</span>
</label>
</div>
</fieldset>
</div>
</section>
<section class="grid overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[1.35fr_.65fr]">
<div class="p-4 text-slate-900 sm:p-5">
<h2 class="font-black text-slate-950">Your requested work</h2>
<div data-summary class="mt-3 grid gap-2">
</div>
<div class="mt-3 flex items-center justify-between border-t border-slate-300 pt-3 text-lg">
<b>Total</b>
<b data-total class="text-amber-600">£0.00</b>
</div>
</div>
<div class="border-t border-line bg-white p-4 sm:p-5 lg:border-l lg:border-t-0">
<label>
<span class="label">Notes For Engineer</span>
<textarea class="field" rows="5" name="notes">
</textarea>
</label>
</div>
</section>
<section class="rounded-2xl border border-line bg-white p-4 sm:p-5">
<div>
<h2 class="text-lg font-black">How would you like to pay?</h2>
</div>
<div class="mt-3 grid gap-2 md:grid-cols-3">
<label class="booking-radio payment-choice">
<input type="radio" name="payment_method" value="bank" required>
<span class="payment-icon" aria-hidden="true">
<svg viewBox="0 0 24 24">
<path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M12 3l9 5H3l9-5Z"/>
</svg>
</span>
<b>Bank Transfer</b>
</label>
<label class="booking-radio payment-choice">
<input type="radio" name="payment_method" value="stripe" required>
<span class="payment-icon" aria-hidden="true">
<svg viewBox="0 0 24 24">
<rect x="2.5" y="5" width="19" height="14" rx="2"/>
<path d="M3 10h18M7 15h3"/>
</svg>
</span>
<b>Debit/Credit Card</b>
</label>
<label class="booking-radio payment-choice">
<input type="radio" name="payment_method" value="cash" required>
<span class="payment-icon" aria-hidden="true">
<svg viewBox="0 0 24 24">
<rect x="3" y="6" width="18" height="12" rx="2"/>
<circle cx="12" cy="12" r="2.5"/>
<path d="M7 9H6v1m11-1h1v1M7 15H6v-1m11 1h1v-1"/>
</svg>
</span>
<b>Cash to Engineer</b>
</label>
</div>
<div data-card-panel hidden class="stripe-card-panel">
<div class="stripe-card-heading">
<b>Pay by Debit/Credit Card</b>
<img src="<?php echo esc_url(
    EICR_THEME_URI .
        "/assets/images/power-by-stripe_03-quhydh1w3dtm7dvulnx9tky1a84fnl0qlgkrsii0d4.webp",
); ?>" alt="Powered by Stripe">
</div>
<div data-stripe-element-wrap hidden>
<div class="stripe-split-fields">
<div class="stripe-split-field stripe-split-number">
<div id="eicr-card-number">
</div>
</div>
<div class="stripe-split-field">
<div id="eicr-card-expiry">
</div>
</div>
<div class="stripe-split-field">
<div id="eicr-card-cvc">
</div>
</div>
</div>
</div>
<p data-stripe-setup class="stripe-setup-note">Secure card payment is temporarily unavailable. Please choose another payment method or contact us.</p>
<p data-card-error class="stripe-card-error" aria-live="polite">
</p>
</div>
</section>
<label class="booking-terms-consent">
<input type="checkbox" name="terms_accepted" value="1" required>
<span>I agree to the <a href="<?php echo esc_url(home_url('/terms/')); ?>" target="_blank" rel="noopener">Terms &amp; Conditions</a> and acknowledge the <a href="<?php echo esc_url(home_url('/privacy/')); ?>" target="_blank" rel="noopener">Privacy Policy</a>.</span>
</label>
</div>
<input type="hidden" name="action" value="eicr_booking_v2">
<input type="hidden" name="nonce" value="<?php echo esc_attr(
    wp_create_nonce("eicr_public"),
); ?>">
<p data-message class="mt-4 font-bold" aria-live="polite">
</p>
<div class="booking-form-actions mt-5 flex items-center justify-between gap-4 border-t border-line pt-6">
<span data-next-note class="text-xs font-semibold text-muted">Suitable checks can be combined in one request.</span>
<span data-submit-note hidden class="max-w-md text-xs font-semibold leading-5 text-slate-600">We review every submitted scope before confirming the appointment and assigned specialist.</span>
<button type="button" data-next class="rounded-xl bg-gold px-5 py-2.5 text-sm font-black">Continue</button>
<button type="submit" data-submit hidden class="rounded-xl bg-ink px-5 py-2.5 text-sm font-black text-white">Submit</button>
</div>
<p class="booking-company-intro booking-company-intro-bottom">EICR in London coordinates scope-matched specialists for electrical, gas, energy, fire-safety and property-assessment work across London and selected M25 locations. Every request is reviewed for the property type, access requirements and relevant professional scope before confirmation.</p>
</div>
</form>
<div data-booking-success hidden class="booking-success-overlay">
<div class="booking-success-card">
<div class="booking-success-check">✓</div>
<h2>Your request has been sent</h2>
<p data-success-message>We have received your property booking details.</p>
<p class="booking-success-call">After confirmation, the attending specialist will contact you before travelling to the property.</p>
<a href="<?php echo esc_url(
    home_url("/"),
); ?>">Return home</a>
</div>
</div>
</div>
<?php return ob_get_clean();
}
add_shortcode("eicr_booking", "eicr_booking_v2");

<?php
if (!defined("ABSPATH")) {
    exit();
}

add_action(
    "admin_menu",
    function () {
        add_menu_page(
            "EICR Admin",
            "EICR Admin",
            "manage_options",
            "eicr-control",
            "eicr_admin_dashboard_page",
            "dashicons-shield-alt",
            2,
        );
        add_submenu_page(
            "eicr-control",
            "Overview",
            "Overview",
            "manage_options",
            "eicr-control",
            "eicr_admin_dashboard_page",
        );
        add_submenu_page(
            "eicr-control",
            "Business & Contact",
            "Business & Contact",
            "manage_options",
            "eicr-business",
            function () {
                eicr_settings_section_page("business");
            },
        );
        add_submenu_page(
            "eicr-control",
            "Colours & Style",
            "Colours & Style",
            "manage_options",
            "eicr-colours",
            function () {
                eicr_settings_section_page("colours");
            },
        );
        add_submenu_page(
            "eicr-control",
            "Payments & Stripe",
            "Payments & Stripe",
            "manage_options",
            "eicr-payments",
            function () {
                eicr_settings_section_page("payments");
            },
        );
        add_submenu_page(
            "eicr-control",
            "SEO & Campaign Tracking",
            "SEO & Campaign Tracking",
            "manage_options",
            "eicr-seo",
            function () {
                eicr_settings_section_page("seo");
            },
        );
    },
    5,
);

add_action("admin_init", function () {
    register_setting("eicr_settings", "eicr_settings", [
        "sanitize_callback" => "eicr_clean_settings",
    ]);
});
function eicr_colour_defaults()
{
    return [
        "colour_accent" => "#c35a2e",
        "colour_accent_hover" => "#9a3f20",
        "colour_accent_soft" => "#fff0e8",
        "colour_heading" => "#000000",
        "colour_body" => "#202020",
        "colour_dark" => "#121826",
        "colour_dark_text" => "#ffffff",
        "colour_page" => "#fcfbfa",
        "colour_soft" => "#f7f4f1",
        "colour_border" => "#e4ddd6",
        "colour_button_text" => "#ffffff",
        "colour_success" => "#1f8a5b",
        "colour_error" => "#dc2626",
    ];
}
add_action("init", function () {
    if (get_option("eicr_colour_palette_version") === "copper-contrast-2") {
        return;
    }

    $saved = (array) get_option("eicr_settings", []);
    $current = strtolower((string) ($saved["colour_accent"] ?? ""));
    $previous_defaults = ["", "#0f766e", "#115e59", "#ffc107", "#fbbf24"];
    if (in_array($current, $previous_defaults, true)) {
        foreach (eicr_colour_defaults() as $key => $value) {
            $saved[$key] = $value;
        }
    }

    $current_heading = strtolower((string) ($saved["colour_heading"] ?? ""));
    if (
        in_array(
            $current_heading,
            ["", "#172033", "#0f172a", "#0b0b0b"],
            true,
        )
    ) {
        $saved["colour_heading"] = "#000000";
    }
    $current_body = strtolower((string) ($saved["colour_body"] ?? ""));
    if (
        in_array(
            $current_body,
            ["", "#52606d", "#475569", "#64748b", "#1f2933"],
            true,
        )
    ) {
        $saved["colour_body"] = "#202020";
    }
    $current_dark_text = strtolower(
        (string) ($saved["colour_dark_text"] ?? ""),
    );
    if (in_array($current_dark_text, ["", "#f8f5f2", "#ffffff"], true)) {
        $saved["colour_dark_text"] = "#ffffff";
    }
    update_option("eicr_settings", $saved);

    update_option("eicr_colour_palette_version", "copper-contrast-2");
}, 7);
function eicr_clean_settings($v)
{
    $out = (array) get_option("eicr_settings", []);
    $colour_keys = array_keys(eicr_colour_defaults());
    $secret_keys = ["stripe_secret", "stripe_webhook_secret"];
    foreach ((array) $v as $k => $x) {
        $key = sanitize_key($k);
        if (in_array($key, $colour_keys, true)) {
            $clean = sanitize_hex_color($x);
            if ($clean) {
                $out[$key] = $clean;
            }
            continue;
        }
        if ($key === "previous_review_count") {
            $out[$key] = min(100000, absint($x));
            continue;
        }
        if (in_array($key, $secret_keys, true)) {
            $secret = trim((string) $x);
            if ($secret !== "") {
                $out[$key] = sanitize_text_field($secret);
            }
            continue;
        }
        $out[$key] = is_array($x)
            ? array_map("sanitize_text_field", $x)
            : sanitize_text_field($x);
    }
    return $out;
}
function eicr_secret_field($key, $label, $help = "")
{
    $settings = (array) get_option("eicr_settings", []);
    $saved = !empty($settings[$key]);
    $description = $saved
        ? "A value is saved. Leave this field blank to keep it."
        : "No value is currently saved.";
    if ($help) {
        $description .= " " . $help;
    }
    echo '<tr><th><label for="' .
        esc_attr($key) .
        '">' .
        esc_html($label) .
        '</label></th><td><input class="regular-text" type="password" autocomplete="new-password" id="' .
        esc_attr($key) .
        '" name="eicr_settings[' .
        esc_attr($key) .
        ']" value=""><p class="description">' .
        esc_html($description) .
        "</p></td></tr>";
}
function eicr_checkbox_field($key, $label, $help = "")
{
    $settings = (array) get_option("eicr_settings", []);
    $checked = !empty($settings[$key]);
    echo '<tr><th>' . esc_html($label) . '</th><td><input type="hidden" name="eicr_settings[' .
        esc_attr($key) . ']" value="0"><label><input type="checkbox" name="eicr_settings[' .
        esc_attr($key) . ']" value="1" ' . checked($checked, true, false) . '> Enabled</label>' .
        ($help ? '<p class="description">' . esc_html($help) . "</p>" : "") . "</td></tr>";
}
function eicr_field($key, $label, $type = "text", $help = "")
{
    $o = get_option("eicr_settings", []);
    $v = $o[$key] ?? "";
    echo '<tr><th><label for="' .
        $key .
        '">' .
        esc_html($label) .
        '</label></th><td><input class="regular-text" type="' .
        esc_attr($type) .
        '" id="' .
        $key .
        '" name="eicr_settings[' .
        $key .
        ']" value="' .
        esc_attr($v) .
        '">' .
        ($help ? '<p class="description">' . esc_html($help) . "</p>" : "") .
        "</td></tr>";
}
function eicr_colour_field($key, $label, $help = "")
{
    $saved = get_option("eicr_settings", []);
    $defaults = eicr_colour_defaults();
    $value = $saved[$key] ?? $defaults[$key];
    echo '<tr><th><label for="' .
        esc_attr($key) .
        '">' .
        esc_html($label) .
        '</label></th><td><input class="eicr-colour-picker" type="text" id="' .
        esc_attr($key) .
        '" name="eicr_settings[' .
        esc_attr($key) .
        ']" value="' .
        esc_attr($value) .
        '" data-default-color="' .
        esc_attr($defaults[$key]) .
        '">' .
        ($help ? '<p class="description">' . esc_html($help) . "</p>" : "") .
        "</td></tr>";
}
function eicr_settings_form_start($title, $copy = "")
{
    echo '<div class="wrap eicr-admin-wrap"><h1>' . esc_html($title) . "</h1>";
    if ($copy) {
        echo "<p>" . esc_html($copy) . "</p>";
    }
    echo '<form method="post" action="options.php">';
    settings_fields("eicr_settings");
    echo '<table class="form-table">';
}
function eicr_settings_form_end()
{
    echo "</table>";
    submit_button("Save changes");
    echo "</form></div>";
}
function eicr_settings_section_page($section)
{
    if (!current_user_can("manage_options")) {
        return;
    }
    if ($section === "business") {
        eicr_settings_form_start(
            "Business & Contact",
            "Used across the website, booking confirmations and customer communication.",
        );
        eicr_field("legal_business_name", "Legal business name", "text", "Used in legal notices and invoices. Leave blank to use EICR in London.");
        eicr_field("company_number", "Companies House number", "text", "Leave blank if not applicable.");
        eicr_field("ico_registration", "ICO registration number", "text", "Leave blank if not applicable.");
        eicr_field("phone", "Phone / WhatsApp");
        eicr_field("email", "Business email", "email");
        eicr_field("privacy_email", "Privacy contact email", "email", "Leave blank to use the business email.");
        eicr_field(
            "invoice_email",
            "Invoice archive email",
            "email",
            "A copy of every invoice will be sent to this separate address.",
        );
        eicr_field("address", "Business address");
        eicr_field(
            "previous_review_count",
            "Reviews recorded on previous website",
            "number",
            "Set this to 0 to hide the previous-site review history. Enter only a total you can substantiate.",
        );
        echo '<tr><th colspan="2"><h2>Verified credentials</h2><p class="description">Enter only current registration or qualification references that belong to this business or the professionals delivering the relevant scope. Blank credentials are not shown publicly.</p></th></tr>';
        eicr_field("niceic_registration", "NICEIC registration");
        eicr_field("napit_registration", "NAPIT registration");
        eicr_field("gas_safe_registration", "Gas Safe registration");
        eicr_field("trustmark_registration", "TrustMark registration");
        eicr_field("elmhurst_registration", "Elmhurst Energy registration");
        eicr_field("city_guilds_reference", "City & Guilds reference");
        eicr_settings_form_end();
    }
    if ($section === "colours") {
        eicr_settings_form_start(
            "Colours & Style",
            "Change the shared website palette here. Saving applies the colours to every public page, including booking and payment sections.",
        );
        eicr_colour_field(
            "colour_accent",
            "Primary accent",
            "Buttons, active choices, links, icons and decorative highlights.",
        );
        eicr_colour_field(
            "colour_accent_hover",
            "Accent hover",
            "Button and link hover colour.",
        );
        eicr_colour_field(
            "colour_accent_soft",
            "Light accent background",
            "Selected cards, badges and highlighted notes.",
        );
        eicr_colour_field(
            "colour_heading",
            "Headings & navigation",
            "Headings, navigation and important labels on light backgrounds.",
        );
        eicr_colour_field(
            "colour_body",
            "Body text",
            "Paragraphs and secondary text on light backgrounds.",
        );
        eicr_colour_field(
            "colour_dark",
            "Dark sections",
            "Hero, dark cards and footer background.",
        );
        eicr_colour_field(
            "colour_dark_text",
            "Text on dark sections",
            "Hero and footer text.",
        );
        eicr_colour_field("colour_page", "Main page background");
        eicr_colour_field("colour_soft", "Light section background");
        eicr_colour_field("colour_border", "Borders & dividers");
        eicr_colour_field("colour_button_text", "Text on accent buttons");
        eicr_colour_field(
            "colour_success",
            "Success & WhatsApp",
            "Success states, discount labels and the WhatsApp control.",
        );
        eicr_colour_field(
            "colour_error",
            "Validation errors",
            "Required-field and payment error messages.",
        );
        eicr_settings_form_end();
    }
    if ($section === "payments") {
        eicr_settings_form_start(
            "Payments & Stripe",
            "Bank transfer and cash remain available. Embedded secure card fields activate after valid Stripe keys are saved.",
        );
        eicr_field("stripe_publishable", "Stripe publishable key");
        eicr_secret_field("stripe_secret", "Stripe secret key");
        eicr_secret_field(
            "stripe_webhook_secret",
            "Stripe webhook signing secret",
        );
        eicr_field("bank_name", "Bank name");
        eicr_field("bank_account_name", "Account name");
        eicr_field("bank_sort_code", "Sort code");
        eicr_field("bank_account_number", "Account number");
        eicr_settings_form_end();
        echo "<p><strong>Webhook URL:</strong> <code>" .
            esc_html(rest_url("eicr/v1/stripe-webhook")) .
            "</code></p>";
    }
    if ($section === "seo") {
        eicr_settings_form_start(
            "SEO, Analytics & Google Ads",
            "Configure search verification and conversion measurement for campaigns. These settings do not place adverts on your website.",
        );
        eicr_field("seo_description", "Default SEO description");
        eicr_field("ga_id", "Google Analytics ID");
        eicr_field("ads_id", "Google Ads ID");
        eicr_field("ads_label", "Google Ads conversion label");
        eicr_field("google_verification", "Google verification code");
        eicr_field("gbp_url", "Google Business Profile URL", "url");
        eicr_settings_form_end();
        echo '<div class="notice notice-info inline"><p><strong>Google Ads:</strong> enter the conversion ID and label from your campaign account to measure enquiries and bookings. This theme contains no AdSense, ad units or advertising space.</p></div>';
    }
}

add_action(
    "init",
    function () {
        if (get_option("eicr_adsense_removed_version") === "1") {
            return;
        }

        $settings = (array) get_option("eicr_settings", []);
        $changed = false;
        foreach (["adsense_client", "adsense_enabled"] as $key) {
            if (array_key_exists($key, $settings)) {
                unset($settings[$key]);
                $changed = true;
            }
        }
        if ($changed) {
            update_option("eicr_settings", $settings);
        }
        delete_option("eicr_adsense_rewrite_version");
        update_option("eicr_adsense_removed_version", "1", false);
        flush_rewrite_rules(false);
    },
    99,
);
function eicr_settings_page()
{
    eicr_settings_section_page("business");
}
function eicr_admin_dashboard_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    $orders = get_posts(["post_type" => "eicr_order", "post_status" => "publish", "numberposts" => -1, "fields" => "ids"]);
    $paid = 0;
    foreach ($orders as $order_id) {
        $data = function_exists("eicr_order_data") ? eicr_order_data($order_id) : [];
        if (($data["status"] ?? "") === "Paid") {
            $paid++;
        }
    }
    $staff = get_users(["role" => "eicr_staff", "fields" => "ids"]);
    $service_counts = wp_count_posts("eicr_service");
    $service_total = isset($service_counts->publish) ? (int) $service_counts->publish : 0;
    echo '<div class="wrap eicr-admin-wrap"><h1>EICR in London Owner Settings</h1><p>Owner-only controls for payments, prices, colours, business details, tracking and staff accounts. Operational customer work is handled in the separate Staff Dashboard.</p><div class="eicr-admin-cards">';
    $cards = [
        ["Paid bookings", $paid, "admin.php?page=eicr-payment-overview"],
        ["Staff accounts", count($staff), "admin.php?page=eicr-staff-accounts"],
        ["Priced services", $service_total, "admin.php?page=eicr-prices"],
    ];
    foreach ($cards as $card) {
        echo '<a class="eicr-admin-card" href="' .
            esc_url(admin_url($card[2])) .
            '"><strong>' .
            esc_html($card[1]) .
            "</strong><span>" .
            esc_html($card[0]) .
            "</span></a>";
    }
    echo '</div><h2>Quick actions</h2><p><a class="button button-primary" href="' .
        esc_url(admin_url("admin.php?page=eicr-payment-overview")) .
        '">Payment overview</a> <a class="button" href="' .
        esc_url(admin_url("admin.php?page=eicr-prices")) .
        '">Manage prices & discounts</a> <a class="button" href="' .
        esc_url(admin_url("admin.php?page=eicr-colours")) .
        '">Change website colours</a> <a class="button" href="' .
        esc_url(admin_url("admin.php?page=eicr-staff-accounts")) .
        '">Manage staff</a> <a class="button" href="' .
        esc_url(admin_url("admin.php?page=eicr-test-customer")) .
        '">Create test customer</a> <a class="button" href="' .
        esc_url(home_url("/staff-dashboard/")) .
        '" target="_blank">Open Staff Dashboard</a> <a class="button" href="' .
        esc_url(home_url("/")) .
        '" target="_blank">View website</a></p></div>';
}
add_action("admin_enqueue_scripts", function ($hook) {
    wp_register_style("eicr-admin-ui", false, [], EICR_THEME_VERSION);
    wp_enqueue_style("eicr-admin-ui");
    wp_add_inline_style(
        "eicr-admin-ui",
        "body{--eicr-admin-accent:#c35a2e}.eicr-admin-wrap{max-width:1100px}.eicr-admin-cards{display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:16px;margin:24px 0}.eicr-admin-card{background:#fff;border:1px solid #dcdcde;border-top:4px solid var(--eicr-admin-accent);padding:22px;text-decoration:none;color:#111}.eicr-admin-card strong{display:block;font-size:30px;line-height:1}.eicr-admin-card span{display:block;margin-top:8px;font-weight:600}@media(max-width:782px){.eicr-admin-cards{grid-template-columns:1fr}}",
    );
    if (strpos($hook, "eicr-colours") !== false) {
        wp_enqueue_style("wp-color-picker");
        wp_enqueue_script("wp-color-picker");
        wp_add_inline_script(
            "wp-color-picker",
            'jQuery(function($){$(".eicr-colour-picker").wpColorPicker();});',
        );
    }
});
function eicr_current_colours()
{
    $defaults = eicr_colour_defaults();
    $saved = (array) get_option("eicr_settings", []);
    foreach ($defaults as $key => $default) {
        $clean = sanitize_hex_color($saved[$key] ?? "");
        $defaults[$key] = $clean ?: $default;
    }
    return $defaults;
}
function eicr_hex_rgba($hex, $alpha)
{
    $hex = ltrim((string) $hex, "#");
    if (strlen($hex) === 3) {
        $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
    }
    if (strlen($hex) !== 6) {
        return "rgba(195,90,46," . (float) $alpha . ")";
    }
    return "rgba(" .
        hexdec(substr($hex, 0, 2)) .
        "," .
        hexdec(substr($hex, 2, 2)) .
        "," .
        hexdec(substr($hex, 4, 2)) .
        "," .
        (float) $alpha .
        ")";
}
function eicr_dynamic_theme_css()
{
    $c = eicr_current_colours();
    $accent_10 = eicr_hex_rgba($c["colour_accent"], 0.1);
    $accent_20 = eicr_hex_rgba($c["colour_accent"], 0.2);
    $accent_40 = eicr_hex_rgba($c["colour_accent"], 0.4);
    return "
:root{
 --eicr-accent:{$c["colour_accent"]};
 --eicr-accent-hover:{$c["colour_accent_hover"]};
 --eicr-accent-soft:{$c["colour_accent_soft"]};
 --eicr-heading:{$c["colour_heading"]};
 --eicr-body:{$c["colour_body"]};
 --eicr-dark:{$c["colour_dark"]};
 --eicr-dark-text:{$c["colour_dark_text"]};
 --eicr-page:{$c["colour_page"]};
 --eicr-soft:{$c["colour_soft"]};
 --eicr-border:{$c["colour_border"]};
 --eicr-on-accent:{$c["colour_button_text"]};
 --eicr-success:{$c["colour_success"]};
 --eicr-error:{$c["colour_error"]};
 --gold:{$c["colour_accent"]};
 --ink:{$c["colour_heading"]};
 --muted:{$c["colour_body"]};
 --mist:{$c["colour_soft"]};
 --line:{$c["colour_border"]};
}
body,.service-detail-page{background:var(--eicr-page);color:var(--eicr-body)}
.text-gold,.text-amber-500,.text-amber-600,.text-amber-800,.service-detail-kicker,.service-process b,.core-page-header>p,.home-coverage-kicker,.eyebrow,.brand small{color:var(--eicr-accent)!important}
.text-ink,.text-black,.text-slate-900,.text-slate-950{color:var(--eicr-heading)!important}
.text-muted,.text-slate-600,.text-slate-700,.text-slate-800{color:var(--eicr-body)!important}
.bg-gold{background-color:var(--eicr-accent)!important;color:var(--eicr-on-accent)!important}
.bg-gold\\/10{background-color:{$accent_10}!important}
.bg-amber-50{background-color:var(--eicr-accent-soft)!important}
.bg-mist,.bg-slate-50,.bg-slate-50\\/70{background-color:var(--eicr-soft)!important}
.bg-ink,.bg-slate-900,.bg-slate-950,.service-detail-hero,footer{background-color:var(--eicr-dark)!important}
.bg-white,.card,.eicr-form,.core-copy,.core-service-grid article,.core-area-grid article,.core-contact-grid>article{background-color:var(--eicr-page)!important}
.border-gold,.border-amber-400{border-color:var(--eicr-accent)!important}
.border-gold\\/40{border-color:{$accent_40}!important}
.ring-gold\\/20{--tw-ring-color:{$accent_20}!important}
.shadow-gold{--tw-shadow-color:{$accent_40}!important}
.from-amber-50{--tw-gradient-from:var(--eicr-accent-soft) var(--tw-gradient-from-position)!important;--tw-gradient-to:transparent var(--tw-gradient-to-position)!important}
.via-mist{--tw-gradient-stops:var(--tw-gradient-from),var(--eicr-soft) var(--tw-gradient-via-position),var(--tw-gradient-to)!important}
.to-white{--tw-gradient-to:var(--eicr-page) var(--tw-gradient-to-position)!important}
.hover\\:bg-amber-400:hover,.hover\\:bg-slate-800:hover{background-color:var(--eicr-accent-hover)!important;color:var(--eicr-on-accent)!important}
.hover\\:bg-amber-50:hover,.hover\\:bg-mist:hover{background-color:var(--eicr-accent-soft)!important}
.hover\\:border-amber-300:hover,.hover\\:border-gold:hover{border-color:var(--eicr-accent)!important}
.hover\\:text-amber-600:hover,.hover\\:text-amber-700:hover,.hover\\:text-amber-800:hover,.hover\\:text-gold:hover{color:var(--eicr-accent-hover)!important}
:focus-visible{outline-color:{$accent_40}!important}
.site-header,.site-header a,.eicr-mobile-nav>a,.eicr-mobile-group-toggle{color:var(--eicr-heading)}
.eicr-mobile-group-toggle:hover,.eicr-mobile-nav>a:hover,.eicr-mobile-submenu a:hover{background:var(--eicr-accent-soft)!important;color:var(--eicr-accent-hover)!important}
.eicr-mobile-submenu{border-left-color:var(--eicr-accent)!important}
.booking-type-card:hover,.booking-radio:hover,.booking-compact .service-option:hover{border-color:var(--eicr-accent)!important;background:var(--eicr-accent-soft)!important}
.booking-type-card:has(input:checked),.booking-radio:has(input:checked),.service-option:has(input:checked){border-color:var(--eicr-accent)!important;background:var(--eicr-accent-soft)!important;box-shadow:inset 0 0 0 1px var(--eicr-accent)!important}
.payment-icon{background:var(--eicr-accent-soft)!important;color:var(--eicr-accent-hover)!important}
.stripe-card-panel{border-color:{$accent_20}!important;background:var(--eicr-soft)!important}
.stripe-card-panel [data-stripe-element-wrap],.stripe-card-panel #eicr-card-number,.stripe-card-panel #eicr-card-expiry,.stripe-card-panel #eicr-card-cvc{background:#fff!important}
.stripe-setup-note,.booking-success-card .booking-success-call,.booking-multi-note{background:var(--eicr-accent-soft)!important;color:var(--eicr-heading)!important;border-color:var(--eicr-accent)!important}
.service-detail-book,.service-detail-included>a,.service-detail-cta,.core-book,.core-cta{background:var(--eicr-accent)!important;color:var(--eicr-on-accent)!important}
.service-detail-included,.home-coverage-areas,.core-service-grid article,.core-area-grid article,.core-contact-grid>article{border-top-color:var(--eicr-accent)!important}
.service-detail-included li:before,.service-why li:before{color:var(--eicr-accent)!important}
.service-detail-soft,.core-page-shell,.home-coverage-section{background:var(--eicr-soft)!important}
.service-detail-cta h2,.service-detail-cta p{color:var(--eicr-on-accent)!important}
.eicr-review-consent{color:var(--eicr-body)}
main h1,main h2,main h3,main h4,main summary,main label,main legend{color:var(--eicr-heading)!important}
.eicr-hero,.eicr-hero h1,.eicr-hero p,.eicr-hero .text-white,.service-detail-hero,.service-detail-hero h1,footer,footer h2,footer strong{color:var(--eicr-dark-text)!important}
.eicr-hero .text-gold,.eicr-hero .text-amber-500,.eicr-hero .text-amber-600,.service-detail-hero .service-detail-kicker,footer .text-gold{color:color-mix(in srgb,var(--eicr-accent) 58%,white)!important}
.eicr-hero-booking,.eicr-hero-booking h2,.eicr-hero-booking p{color:var(--eicr-heading)!important}
.cky-consent-container .cky-btn-accept{border-color:var(--eicr-accent)!important;background:var(--eicr-accent)!important;color:var(--eicr-on-accent)!important}
.bg-mist,.bg-slate-50,.bg-slate-50\\/70,.why,.service-detail-soft,.core-page-shell,.home-coverage-section{background-color:var(--eicr-soft)!important}
.bg-ink,.bg-slate-900,.bg-slate-950,.service-detail-hero,.hero,.service-title,.service-risk,.card-actions a,footer{background-color:var(--eicr-dark)!important}
.bg-white,.card,.eicr-form,.quick-card,.service-card,.why-grid article,.steps,.step,.service-detail-gallery-section,.service-process>div,.service-detail-included,.service-why,.service-faq-wrap details,.core-copy,.core-price-list,.core-service-grid article,.core-area-grid article,.core-contact-grid>article{background-color:var(--eicr-page)!important}
.border-line,.border-slate-200,.booking-type-card,.booking-radio,.service-option,.stripe-card-panel,.stripe-split-field,.eicr-form,.service-card,.why-grid article,.step,.service-detail-included,.service-process>div,.service-why,.service-faq-wrap details,.home-coverage-section,.home-coverage-areas,.core-price-list,.core-service-grid article,.core-area-grid article,.core-contact-grid>article{border-color:var(--eicr-border)!important}
.eicr-service-card{border-left-color:var(--eicr-accent)!important}
.eicr-process article{border-left-color:var(--eicr-accent)!important}
.site-header,.eicr-mobile-nav,.eicr-mobile-nav>a,.eicr-mobile-group-toggle,.eicr-mobile-submenu,.eicr-review-dialog{background:var(--eicr-page)!important}
.stripe-card-panel [data-stripe-element-wrap],.stripe-split-field,.stripe-card-panel #eicr-card-number,.stripe-card-panel #eicr-card-expiry,.stripe-card-panel #eicr-card-cvc,.eicr-form input,.eicr-form select,.eicr-form textarea,.field{background:var(--eicr-page)!important;color:var(--eicr-heading)!important}
.booking-compact h1,.booking-compact h2,.booking-compact h3,.booking-compact b,.booking-compact .label,.service-detail-section h1,.service-detail-section h2,.service-detail-section h3,.core-page-shell h1,.core-page-shell h2,.home-coverage-section h2,.home-coverage-section h3,.step b,.step span{color:var(--eicr-heading)!important}
.booking-compact p,.booking-compact small,.service-detail-section p,.service-detail-editor,.service-detail-included li,.service-why li,.core-page-shell p,.home-coverage-section p,.home-coverage-area span,.step p{color:var(--eicr-body)!important}
.booking-compact>form>header,.booking-compact>form>header h1,.booking-compact>form>header p,.booking-compact>form>header [data-booking-title],.booking-compact>form>header [data-booking-copy]{background-color:var(--eicr-dark)!important;color:var(--eicr-dark-text)!important}
.service-title,.service-title h3,.service-risk,.service-risk h2,.service-risk p,.card-actions a{color:var(--eicr-dark-text)!important}
.booking-success-check,.wa-float b{color:var(--eicr-success)!important}
.eicr-discount-price small{background:var(--eicr-success)!important;color:#fff!important}
.eicr-field-error,.eicr-invalid>legend.label,.eicr-invalid>span.label,.stripe-card-error{color:var(--eicr-error)!important}
.eicr-field-error i{background:var(--eicr-error)!important}
.cky-consent-container .cky-consent-bar,.cky-preference-header,.cky-preference-body-wrapper,.cky-accordion-wrapper,.cky-footer-wrapper{background:var(--eicr-page)!important;border-color:var(--eicr-border)!important}
.cky-consent-container .cky-title,.cky-consent-container .cky-notice-des a,.cky-preference-header .cky-preference-title{color:var(--eicr-heading)!important}
.cky-consent-container .cky-notice-des,.cky-consent-container .cky-notice-des p,.cky-accordion-header .cky-accordion-btn,.cky-accordion-header-des{color:var(--eicr-body)!important}
";
}
add_action(
    "wp_enqueue_scripts",
    function () {
        if (wp_style_is("eicr-theme", "enqueued")) {
            wp_add_inline_style("eicr-theme", eicr_dynamic_theme_css());
        }
    },
    30,
);
add_filter("admin_title", function ($title) {
    return strpos($title, "EICR") === false ? "EICR Admin - " . $title : $title;
});
add_action(
    "wp_head",
    function () {
        $o = get_option("eicr_settings", []);
        if (!empty($o["google_verification"])) {
            echo '<meta name="google-site-verification" content="' .
                esc_attr($o["google_verification"]) .
                '">';
        }
        $ids = array_values(
            array_unique(array_filter([$o["ga_id"] ?? "", $o["ads_id"] ?? ""])),
        );
        if ($ids) {
            echo "<script async src='https://www.googletagmanager.com/gtag/js?id=" .
                esc_attr($ids[0]) .
                "'></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('js',new Date());";
            foreach ($ids as $tag_id) {
                echo "gtag('config','" . esc_js($tag_id) . "');";
            }
            echo "</script>";
        }
        $schema = [
            "@context" => "https://schema.org",
            "@type" => "ProfessionalService",
            "name" => trim((string) ($o["legal_business_name"] ?? "")) ?: get_bloginfo("name"),
            "url" => home_url("/"),
            "telephone" => $o["phone"] ?? "",
            "email" => $o["email"] ?? get_option("admin_email"),
            "areaServed" => ["London", "Greater London", "M25 area"],
            "address" => [
                "@type" => "PostalAddress",
                "streetAddress" => $o["address"] ?? "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS",
                "addressCountry" => "GB",
            ],
            "openingHours" => "Mo-Su 00:00-23:59",
        ];
        if (!empty($o["gbp_url"])) {
            $schema["sameAs"] = [esc_url_raw($o["gbp_url"])];
        }
        echo '<script type="application/ld+json">' .
            wp_json_encode($schema) .
            "</script>";
    },
    5,
);

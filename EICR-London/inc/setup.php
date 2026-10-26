<?php
if (!defined("ABSPATH")) {
    exit();
}
add_action("after_setup_theme", function () {
    add_theme_support("title-tag");
    add_theme_support("post-thumbnails");
    add_theme_support("html5", [
        "search-form",
        "gallery",
        "caption",
        "style",
        "script",
    ]);
    register_nav_menus([
        "primary" => "Primary menu",
        "footer" => "Footer menu",
    ]);
});

function eicr_frontend_head_cleanup()
{
    remove_action("wp_head", "rsd_link");
    remove_action("wp_head", "wlwmanifest_link");
    remove_action("wp_head", "wp_generator");
    remove_action("wp_head", "wp_shortlink_wp_head", 10);
    remove_action("wp_head", "print_emoji_detection_script", 7);
    remove_action("wp_print_styles", "print_emoji_styles");
}
add_action("init", "eicr_frontend_head_cleanup", 1);

add_action("wp_enqueue_scripts", function () {
    $o = get_option("eicr_settings", []);
    $colours = function_exists("eicr_current_colours")
        ? eicr_current_colours()
        : [
            "colour_heading" => "#000000",
            "colour_body" => "#202020",
            "colour_error" => "#dc2626",
        ];
    $stripe_key = $o["stripe_publishable"] ?? "";
    $content = is_singular()
        ? get_post_field("post_content", get_queried_object_id())
        : "";
    $is_booking =
        is_page("booking") ||
        ($content && has_shortcode($content, "eicr_booking"));
    wp_enqueue_style(
        "eicr-site-ui",
        EICR_THEME_URI . "/assets/css/site-ui.css",
        [],
        filemtime(EICR_THEME_DIR . "/assets/css/site-ui.css"),
    );
    wp_enqueue_style(
        "eicr-theme",
        EICR_THEME_URI . "/assets/css/main.css",
        ["eicr-site-ui"],
        filemtime(EICR_THEME_DIR . "/assets/css/main.css"),
    );
    $deps = [];
    if ($stripe_key && $is_booking) {
        wp_enqueue_script("stripe-js", "https://js.stripe.com/v3/", [], null, [
            "strategy" => "defer",
            "in_footer" => true,
        ]);
        $deps[] = "stripe-js";
    }
    wp_enqueue_script(
        "eicr-theme",
        EICR_THEME_URI . "/assets/js/main.js",
        $deps,
        filemtime(EICR_THEME_DIR . "/assets/js/main.js"),
        ["strategy" => "defer", "in_footer" => true],
    );
    wp_localize_script("eicr-theme", "EICR_DATA", [
        "ajax" => admin_url("admin-ajax.php"),
        "nonce" => wp_create_nonce("eicr_public"),
        "stripeKey" => $is_booking ? $stripe_key : "",
        "stripeEnabled" => (bool) ($stripe_key && $is_booking),
        "colours" => [
            "heading" => $colours["colour_heading"],
            "body" => $colours["colour_body"],
            "error" => $colours["colour_error"],
        ],
        "adsId" => $o["ads_id"] ?? "",
        "adsLabel" => $o["ads_label"] ?? "",
    ]);
});
add_action("init", function () {
    register_post_type("eicr_service", [
        "labels" => [
            "name" => "Services",
            "singular_name" => "Service",
            "add_new_item" => "Add Service",
            "edit_item" => "Edit Service",
        ],
        "public" => true,
        "show_in_rest" => true,
        "show_in_menu" => "eicr-control",
        "menu_icon" => "dashicons-shield",
        "supports" => ["title", "editor", "thumbnail", "excerpt"],
        "rewrite" => ["slug" => "services"],
    ]);
    register_post_type("eicr_order", [
        "labels" => ["name" => "Orders", "singular_name" => "Order"],
        "public" => false,
        "show_ui" => true,
        "show_in_menu" => "eicr-control",
        "menu_icon" => "dashicons-cart",
        "supports" => ["title"],
    ]);
    register_post_type("eicr_quote", [
        "labels" => ["name" => "Quotes", "singular_name" => "Quote"],
        "public" => false,
        "show_ui" => true,
        "show_in_menu" => "eicr-control",
        "menu_icon" => "dashicons-format-quote",
        "supports" => ["title"],
    ]);
    register_post_type("eicr_review", [
        "labels" => ["name" => "Reviews", "singular_name" => "Review"],
        "public" => false,
        "show_ui" => true,
        "show_in_menu" => "eicr-control",
        "menu_icon" => "dashicons-star-filled",
        "supports" => ["title", "editor"],
    ]);
});
add_action("add_meta_boxes", function () {
    add_meta_box(
        "eicr_price",
        "Service prices",
        "eicr_price_box",
        "eicr_service",
        "side",
    );
    add_meta_box(
        "eicr_record",
        "Customer and order details",
        "eicr_record_box",
        ["eicr_order", "eicr_quote"],
        "normal",
        "high",
    );
});
function eicr_price_box($post)
{
    wp_nonce_field("eicr_price", "eicr_price_nonce");
    $p = get_post_meta($post->ID, "_eicr_price", true);
    $c = get_post_meta($post->ID, "_eicr_commercial_price", true);
    echo '<p><label for="eicr_price"><strong>Residential starting price (£)</strong></label><input id="eicr_price" class="widefat" type="number" min="0.01" max="100000" step="0.01" name="eicr_price" value="' .
        esc_attr($p) .
        '"></p><p><label for="eicr_commercial_price"><strong>Commercial starting price (£)</strong></label><input id="eicr_commercial_price" class="widefat" type="number" min="0.01" max="100000" step="0.01" name="eicr_commercial_price" value="' .
        esc_attr($c) .
        '"><span class="description">Leave blank to use the residential price or the service minimum.</span></p>';
}
function eicr_record_box($post)
{
    $data = get_post_meta($post->ID, "_eicr_data", true);
    echo '<table class="widefat striped">';
    foreach ((array) $data as $k => $v) {
        echo "<tr><th>" .
            esc_html(ucwords(str_replace("_", " ", $k))) .
            "</th><td>" .
            nl2br(esc_html(is_array($v) ? implode(", ", $v) : $v)) .
            "</td></tr>";
    }
    echo "</table>";
}
add_action("save_post_eicr_service", function ($id) {
    if (
        !isset($_POST["eicr_price_nonce"]) ||
        !wp_verify_nonce(
            sanitize_text_field(wp_unslash($_POST["eicr_price_nonce"])),
            "eicr_price",
        ) ||
        !current_user_can("edit_post", $id)
    ) {
        return;
    }
    $res =
        isset($_POST["eicr_price"]) && $_POST["eicr_price"] !== ""
            ? (float) wp_unslash($_POST["eicr_price"])
            : "";
    $com =
        isset($_POST["eicr_commercial_price"]) &&
        $_POST["eicr_commercial_price"] !== ""
            ? (float) wp_unslash($_POST["eicr_commercial_price"])
            : "";
    eicr_update_service_price($id, "_eicr_price", "_eicr_regular_price", $res);
    eicr_update_service_price(
        $id,
        "_eicr_commercial_price",
        "_eicr_commercial_regular_price",
        $com,
    );
});
add_action("after_switch_theme", "eicr_seed");
function eicr_seed()
{
    if (get_option("eicr_seeded")) {
        return;
    }
    $items = function_exists("eicr_service_catalog")
        ? eicr_service_catalog()
        : [];
    foreach ($items as $item) {
        [$slug, $name, $price, $benefit, $risk, $why] = $item;
        $existing = get_page_by_path($slug, OBJECT, "eicr_service");
        if (!$existing) {
            $existing = get_page_by_title($name, OBJECT, "eicr_service");
        }
        $id = $existing
            ? $existing->ID
            : wp_insert_post([
                "post_type" => "eicr_service",
                "post_status" => "publish",
                "post_title" => $name,
                "post_name" => $slug,
                "post_content" => function_exists(
                    "eicr_service_generated_content",
                )
                    ? eicr_service_generated_content($item)
                    : esc_html($benefit),
            ]);
        if ($id && !get_post_meta($id, "_eicr_price", true)) {
            update_post_meta($id, "_eicr_price", $price);
        }
    }
    foreach (
        ["booking" => "Booking", "request-a-quote" => "Request a Quote"]
        as $slug => $title
    ) {
        if (!get_page_by_path($slug)) {
            wp_insert_post([
                "post_type" => "page",
                "post_status" => "publish",
                "post_title" => $title,
                "post_name" => $slug,
                "post_content" =>
                    $slug === "booking" ? "[eicr_booking]" : "[eicr_quote]",
            ]);
        }
    }
    update_option("eicr_seeded", 1);
    flush_rewrite_rules();
}
add_action(
    "init",
    function () {
        $o = get_option("eicr_settings", []);
        $changed = false;
        $old_phone = $o["phone"] ?? "";
        if (
            !$old_phone ||
            in_array(
                preg_replace("/\s+/", "", $old_phone),
                ["+8801915602811", "8801915602811"],
                true,
            )
        ) {
            $o["phone"] = "+44 7878 655350";
            $changed = true;
        }
        if (empty($o["email"])) {
            $o["email"] = "info@eicrinlondon.co.uk";
            $changed = true;
        }
        if (empty($o["address"])) {
            $o["address"] =
                "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS";
            $changed = true;
        }
        if ($changed) {
            update_option("eicr_settings", $o);
        }
        if (get_option("eicr_phone_version") !== "uk-1") {
            update_option("eicr_phone_version", "uk-1");
        }
    },
    4,
);
function eicr_services()
{
    return get_posts([
        "post_type" => "eicr_service",
        "numberposts" => -1,
        "post_status" => "publish",
        "orderby" => "menu_order title",
        "order" => "ASC",
    ]);
}
function eicr_credentials_html()
{
    $settings = (array) get_option("eicr_settings", []);
    $credentials = [
        "niceic_registration" => ["NICEIC", "niceic-approved.webp"],
        "napit_registration" => ["NAPIT", "napit-approved.webp"],
        "gas_safe_registration" => ["Gas Safe Register", "gas-safe-register.webp"],
        "trustmark_registration" => ["TrustMark", "trustmark-approved.webp"],
        "elmhurst_registration" => ["Elmhurst Energy", "elmhurst-energy-approved.webp"],
        "city_guilds_reference" => ["City & Guilds", "city-and-guilds.webp"],
    ];
    $items = [];
    foreach ($credentials as $key => $credential) {
        $reference = trim((string) ($settings[$key] ?? ""));
        if ($reference === "") {
            continue;
        }
        $items[] = '<div class="eicr-credential-card"><img src="' .
            esc_url(EICR_THEME_URI . "/assets/images/" . $credential[1]) .
            '" alt="' . esc_attr($credential[0]) . '" loading="lazy"><span><strong>' .
            esc_html($credential[0]) . '</strong><small>Reference: ' .
            esc_html($reference) . "</small></span></div>";
    }
    if (!$items) {
        return "";
    }
    return '<div class="eicr-credential-list-wrap"><div class="eicr-credential-list">' .
        implode("", $items) .
        '</div><p>Registration details shown here are maintained for customer reference.</p></div>';
}

function eicr_template_html($file)
{
    static $template_cache = [];
    $file = ltrim((string) $file, "/\\");
    $path = EICR_THEME_DIR . "/" . $file;
    if (strpos($file, "..") !== false || !is_file($path)) {
        return "";
    }
    if (!array_key_exists($path, $template_cache)) {
        $template_cache[$path] = (string) file_get_contents($path);
    }
    $html = $template_cache[$path];
    $o = get_option("eicr_settings", []);
    $phone = $o["phone"] ?? "+44 7878 655350";
    $email = $o["email"] ?? "info@eicrinlondon.co.uk";
    $address =
        $o["address"] ??
        "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS";
    $digits = preg_replace("/\D+/", "", $phone);
    $html = str_replace(
        [
            "__ASSET__",
            "__HOME__",
            "__YEAR__",
            "__EICR_CREDENTIALS__",
            "__ADDRESS__",
        ],
        [
            esc_url(EICR_THEME_URI . "/assets/images"),
            esc_url(home_url("")),
            esc_html(wp_date("Y")),
            eicr_credentials_html(),
            esc_html($address),
        ],
        $html,
    );
    $html = str_replace(
        [
            "+44 7878 655350",
            "447878655350",
            "info@eicrinlondon.co.uk",
        ],
        [
            esc_html($phone),
            esc_attr($digits),
            esc_attr($email),
        ],
        $html,
    );
    $html = eicr_apply_live_prices_to_html($html);
    return $html;
}

<?php
if (!defined("ABSPATH")) {
    exit();
}

define("EICR_CUSTOMER_PORTAL_VERSION", "1.6.0");

function eicr_customer_page_url($slug, $args = [])
{
    static $page_urls = [];
    $slug = sanitize_title($slug);
    if (!isset($page_urls[$slug])) {
        $page = get_page_by_path($slug, OBJECT, "page");
        $page_urls[$slug] = $page ? get_permalink($page) : home_url("/" . $slug . "/");
    }
    $url = $page_urls[$slug];
    return $args ? add_query_arg($args, $url) : $url;
}

function eicr_customer_sign_in_url($args = [])
{
    return eicr_customer_page_url("sign-in", $args);
}

function eicr_customer_register_url($args = [])
{
    return eicr_customer_page_url("create-account", $args);
}

function eicr_customer_account_url($args = [])
{
    return eicr_customer_page_url("my-account", $args);
}

function eicr_customer_password_reset_url($args = [])
{
    return eicr_customer_page_url("reset-password", $args);
}

function eicr_customer_logout_url()
{
    return wp_logout_url(eicr_customer_sign_in_url());
}

function eicr_customer_booking_url($service = "")
{
    $page = get_page_by_path("booking", OBJECT, "page");
    $url = $page ? get_permalink($page) : home_url("/booking/");
    $service = sanitize_title($service);
    return $service ? add_query_arg("service", $service, $url) : $url;
}

function eicr_customer_safe_booking_redirect($raw = "")
{
    $raw = is_string($raw) ? trim(wp_unslash($raw)) : "";
    if ($raw === "") {
        return "";
    }
    $validated = wp_validate_redirect($raw, "");
    if (!$validated) {
        return "";
    }
    $home_host = strtolower((string) wp_parse_url(home_url("/"), PHP_URL_HOST));
    $target_host = strtolower((string) wp_parse_url($validated, PHP_URL_HOST));
    $booking_path = untrailingslashit((string) wp_parse_url(eicr_customer_booking_url(), PHP_URL_PATH));
    $target_path = untrailingslashit((string) wp_parse_url($validated, PHP_URL_PATH));
    if (!$home_host || $home_host !== $target_host || $booking_path !== $target_path) {
        return "";
    }
    $query = [];
    parse_str((string) wp_parse_url($validated, PHP_URL_QUERY), $query);
    return eicr_customer_booking_url($query["service"] ?? "");
}

function eicr_customer_booking_login_url($destination = "")
{
    $destination = eicr_customer_safe_booking_redirect($destination) ?: eicr_customer_booking_url();
    return eicr_customer_sign_in_url([
        "login_required" => "booking",
        "redirect_to" => $destination,
    ]);
}

function eicr_is_booking_page_request()
{
    if (is_page("booking")) {
        return true;
    }
    $post = get_queried_object();
    return $post instanceof WP_Post && $post->post_type === "page" && has_shortcode((string) $post->post_content, "eicr_booking");
}

add_action("template_redirect", function () {
    $has_customer_role = eicr_is_customer_user();
    $is_customer = eicr_is_verified_customer_user();
    if ($has_customer_role && !$is_customer) {
        wp_clear_auth_cookie();
        wp_set_current_user(0);
    }
    if ($is_customer && is_page(["sign-in", "create-account"])) {
        $destination = eicr_customer_safe_booking_redirect($_GET["redirect_to"] ?? "");
        if ($destination) {
            wp_safe_redirect($destination);
            exit();
        }
        wp_safe_redirect(eicr_customer_account_url());
        exit();
    }
    if (!$is_customer && is_page("my-account")) {
        $args = [];
        if ($has_customer_role) {
            $args["account_error"] = "verification_required";
        } elseif (is_user_logged_in()) {
            $args["account_error"] = "customer_required";
        }
        wp_safe_redirect(eicr_customer_sign_in_url($args));
        exit();
    }
    if ($is_customer || !eicr_is_booking_page_request()) {
        return;
    }
    $destination = eicr_customer_booking_url(sanitize_title(wp_unslash($_GET["service"] ?? "")));
    wp_safe_redirect(eicr_customer_booking_login_url($destination));
    exit();
}, 5);

function eicr_customer_portal_install()
{
    add_role("eicr_customer", "EICR Customer", ["read" => true]);
    $pages = [
        "sign-in" => ["Sign In", "[eicr_customer_sign_in]"],
        "create-account" => ["Create Account", "[eicr_customer_register]"],
        "my-account" => ["My Account", "[eicr_customer_dashboard]"],
        "reset-password" => ["Reset Password", "[eicr_customer_password_reset]"],
    ];
    foreach ($pages as $slug => $details) {
        $page = get_page_by_path($slug, OBJECT, "page");
        if (!$page) {
            wp_insert_post([
                "post_type" => "page",
                "post_status" => "publish",
                "post_title" => $details[0],
                "post_name" => $slug,
                "post_content" => $details[1],
            ]);
            continue;
        }
        if (trim((string) $page->post_content) !== $details[1] || $page->post_title !== $details[0]) {
            wp_update_post([
                "ID" => $page->ID,
                "post_title" => $details[0],
                "post_content" => $details[1],
            ]);
        }
    }
    update_option("eicr_customer_portal_version", EICR_CUSTOMER_PORTAL_VERSION);
}
add_action("after_switch_theme", "eicr_customer_portal_install", 20);
add_action("init", function () {
    if (get_option("eicr_customer_portal_version") !== EICR_CUSTOMER_PORTAL_VERSION) {
        eicr_customer_portal_install();
    }
}, 20);

function eicr_is_customer_user($user = null)
{
    $user = $user ?: wp_get_current_user();
    return $user && $user->exists() && in_array("eicr_customer", (array) $user->roles, true);
}

function eicr_customer_email_verified($user = null)
{
    $user = $user ?: wp_get_current_user();
    if (!$user || !$user->exists() || !eicr_is_customer_user($user)) {
        return false;
    }
    if (get_user_meta($user->ID, "_eicr_email_verified", true) === "1") {
        return true;
    }
    foreach (["google", "facebook", "microsoft", "apple"] as $provider) {
        if (get_user_meta($user->ID, "_eicr_" . $provider . "_sub", true)) {
            return true;
        }
    }
    return false;
}

function eicr_is_verified_customer_user($user = null)
{
    $user = $user ?: wp_get_current_user();
    return eicr_is_customer_user($user) && eicr_customer_email_verified($user);
}

add_filter("show_admin_bar", function ($show) {
    return false;
});

add_filter("body_class", function ($classes) {
    if (is_admin()) {
        return $classes;
    }
    $classes = array_values(array_diff((array) $classes, ["logged-in", "admin-bar"]));
    if (is_page(["staff-login", "staff-verify", "staff-dashboard"])) {
        $classes[] = "eicr-staff-page";
    }
    return $classes;
}, 20);

add_action("admin_init", function () {
    global $pagenow;
    if (eicr_is_customer_user() && !wp_doing_ajax() && $pagenow !== "admin-post.php") {
        if (!eicr_is_verified_customer_user()) {
            wp_clear_auth_cookie();
            wp_safe_redirect(eicr_customer_sign_in_url(["account_error" => "verification_required"]));
            exit();
        }
        wp_safe_redirect(eicr_customer_account_url());
        exit();
    }
});

function eicr_customer_default_avatar_url()
{
    return EICR_THEME_URI . "/assets/images/account-profile.png";
}

function eicr_customer_avatar_url($user_id = 0)
{
    $user_id = $user_id ?: get_current_user_id();
    $relative = $user_id ? ltrim((string) get_user_meta($user_id, "_eicr_profile_photo_file", true), "/\\") : "";
    $uploads = wp_get_upload_dir();
    if ($relative && strpos($relative, "..") === false && empty($uploads["error"])) {
        $path = wp_normalize_path(trailingslashit($uploads["basedir"]) . $relative);
        $base = trailingslashit(wp_normalize_path($uploads["basedir"]));
        if (str_starts_with($path, $base) && is_file($path)) {
            return trailingslashit($uploads["baseurl"]) . str_replace(DIRECTORY_SEPARATOR, "/", $relative);
        }
    }
    return eicr_customer_default_avatar_url();
}

function eicr_customer_delete_profile_photo($user_id)
{
    $relative = ltrim((string) get_user_meta($user_id, "_eicr_profile_photo_file", true), "/\\");
    $uploads = wp_get_upload_dir();
    if ($relative && strpos($relative, "..") === false && empty($uploads["error"])) {
        $path = wp_normalize_path(trailingslashit($uploads["basedir"]) . $relative);
        $base = trailingslashit(wp_normalize_path($uploads["basedir"]));
        if (str_starts_with($path, $base) && is_file($path)) {
            @unlink($path);
        }
    }
    delete_user_meta($user_id, "_eicr_profile_photo_file");
    delete_user_meta($user_id, "_eicr_profile_photo_source");
    delete_user_meta($user_id, "_eicr_google_picture_url");
}

function eicr_customer_store_profile_photo($user_id, $temporary_path, $original_name, $source = "custom", $uploaded = true)
{
    if (!$temporary_path || !is_file($temporary_path) || filesize($temporary_path) > 3 * MB_IN_BYTES) {
        return new WP_Error("profile_image", "Please choose a JPG, PNG or WebP image no larger than 3 MB.");
    }
    $mimes = ["jpg|jpeg|jpe" => "image/jpeg", "png" => "image/png", "webp" => "image/webp"];
    $extensions = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    $checked = wp_check_filetype_and_ext($temporary_path, sanitize_file_name($original_name), $mimes);
    $image = @getimagesize($temporary_path);
    $mime = is_array($image) ? (string) ($image["mime"] ?? "") : "";
    if (empty($checked["type"]) || !isset($extensions[$checked["type"]]) || $mime !== $checked["type"]) {
        return new WP_Error("profile_image", "Please choose a genuine JPG, PNG or WebP image.");
    }
    $uploads = wp_get_upload_dir();
    if (!empty($uploads["error"])) {
        return new WP_Error("profile_image", "The profile image folder is not available.");
    }
    $directory = trailingslashit($uploads["basedir"]) . "eicr-customer-profiles";
    if (!wp_mkdir_p($directory)) {
        return new WP_Error("profile_image", "The profile image folder could not be created.");
    }
    $filename = wp_unique_filename($directory, "customer-" . absint($user_id) . "-" . wp_generate_password(10, false, false) . "." . $extensions[$checked["type"]]);
    $destination = trailingslashit($directory) . $filename;
    if ($uploaded) {
        $saved = @move_uploaded_file($temporary_path, $destination);
    } else {
        $saved = @rename($temporary_path, $destination);
        if (!$saved && @copy($temporary_path, $destination)) {
            @unlink($temporary_path);
            $saved = true;
        }
    }
    if (!$saved) {
        return new WP_Error("profile_image", "The profile image could not be saved.");
    }
    require_once ABSPATH . "wp-admin/includes/image.php";
    $editor = wp_get_image_editor($destination);
    if (is_wp_error($editor)) {
        @unlink($destination);
        return new WP_Error("profile_image", "The profile image could not be processed.");
    }
    $editor->resize(512, 512, true);
    $result = $editor->save($destination);
    if (is_wp_error($result)) {
        @unlink($destination);
        return new WP_Error("profile_image", "The profile image could not be processed.");
    }
    eicr_customer_delete_profile_photo($user_id);
    update_user_meta($user_id, "_eicr_profile_photo_file", "eicr-customer-profiles/" . basename($destination));
    update_user_meta($user_id, "_eicr_profile_photo_source", sanitize_key($source));
    return true;
}

function eicr_customer_import_google_avatar($user_id, $url)
{
    $url = esc_url_raw($url);
    $host = strtolower((string) wp_parse_url($url, PHP_URL_HOST));
    $scheme = strtolower((string) wp_parse_url($url, PHP_URL_SCHEME));
    $old_url = (string) get_user_meta($user_id, "_eicr_google_picture_url", true);
    $google_host = $host === "googleusercontent.com" || str_ends_with($host, ".googleusercontent.com");
    if (!$url || $scheme !== "https" || !$google_host || get_user_meta($user_id, "_eicr_profile_photo_source", true) === "custom" || ($old_url === $url && eicr_customer_avatar_url($user_id) !== eicr_customer_default_avatar_url())) {
        return;
    }
    $response = wp_safe_remote_get($url, ["timeout" => 15, "redirection" => 3, "limit_response_size" => 3 * MB_IN_BYTES]);
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return;
    }
    $body = wp_remote_retrieve_body($response);
    $mime = strtolower(trim(strtok((string) wp_remote_retrieve_header($response, "content-type"), ";")));
    $extensions = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    if (!$body || !isset($extensions[$mime]) || strlen($body) > 3 * MB_IN_BYTES) {
        return;
    }
    require_once ABSPATH . "wp-admin/includes/file.php";
    $temporary = wp_tempnam("eicr-google-avatar." . $extensions[$mime]);
    if (!$temporary || file_put_contents($temporary, $body, LOCK_EX) === false) {
        return;
    }
    $stored = eicr_customer_store_profile_photo($user_id, $temporary, "google-avatar." . $extensions[$mime], "google", false);
    if (is_wp_error($stored)) {
        @unlink($temporary);
        return;
    }
    update_user_meta($user_id, "_eicr_google_picture_url", $url);
}

function eicr_customer_header_link()
{
    $logged_in = eicr_is_verified_customer_user();
    $label = $logged_in ? "My account" : "Sign in";
    $url = $logged_in ? eicr_customer_account_url() : eicr_customer_sign_in_url();
    $icon = '<img src="' . esc_url($logged_in ? eicr_customer_avatar_url() : eicr_customer_default_avatar_url()) . '" alt="" aria-hidden="true">';
    $popup_attributes = $logged_in ? ' aria-haspopup="true" aria-expanded="false"' : "";
    $link = '<a class="eicr-account-nav-link" href="' . esc_url($url) . '" aria-label="' . esc_attr($label) . '" title="' . esc_attr($label) . '"' . $popup_attributes . '>' . $icon . '<span class="eicr-visually-hidden">' . esc_html($label) . '</span></a>';
    if (!$logged_in) {
        return '<div class="eicr-account-menu eicr-account-menu-guest">' . $link . "</div>";
    }
    return '<div class="eicr-account-menu">' . $link . '<div class="eicr-account-popover" aria-label="Account menu"><a href="' . esc_url(eicr_customer_account_url()) . '">Account overview</a><a href="' . esc_url(eicr_customer_account_url(["section" => "certificates"])) . '">Certificates</a><a class="eicr-popover-logout" href="' . esc_url(eicr_customer_logout_url()) . '">Sign out</a></div></div>';
}

function eicr_customer_has_submitted_review($user_id = 0)
{
    static $cache = [];
    $user_id = $user_id ?: get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }
    if (array_key_exists($user_id, $cache)) {
        return $cache[$user_id];
    }
    if (get_user_meta($user_id, "_eicr_has_submitted_review", true)) {
        return $cache[$user_id] = true;
    }
    $existing = get_posts([
        "post_type" => "eicr_review",
        "post_status" => ["publish", "pending", "draft", "private"],
        "posts_per_page" => 1,
        "fields" => "ids",
        "meta_key" => "_eicr_reviewer_user_id",
        "meta_value" => (int) $user_id,
        "no_found_rows" => true,
    ]);
    if (!$existing) {
        return $cache[$user_id] = false;
    }
    update_user_meta($user_id, "_eicr_has_submitted_review", "1");
    return $cache[$user_id] = true;
}

function eicr_customer_review_unlocked($user_id = 0)
{
    $user_id = $user_id ?: get_current_user_id();
    return $user_id > 0 && (bool) get_user_meta($user_id, "_eicr_review_unlocked_at", true);
}

function eicr_customer_app_icon($key)
{
    $icons = [
        "overview" => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"/></svg>',
        "bookings" => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V2Zm12 8H5v10h14V10ZM5 8h14V6H5v2Z"/></svg>',
        "certificates" => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l5 5v15H6V2Zm8 2.8V8h3.2L14 4.8ZM8 11v2h9v-2H8Zm0 4v2h9v-2H8Z"/></svg>',
        "profile" => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z"/></svg>',
        "review" => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"/></svg>',
    ];
    return $icons[$key] ?? "";
}

function eicr_customer_account_navigation($active = "overview")
{
    $active = sanitize_key($active);
    $user = wp_get_current_user();
    $items = [
        "overview" => ["Overview", eicr_customer_account_url()],
        "bookings" => ["Bookings", eicr_customer_account_url(["section" => "bookings"])],
        "certificates" => ["Certificates", eicr_customer_account_url(["section" => "certificates"])],
        "profile" => ["Profile", eicr_customer_account_url(["section" => "profile"])],
    ];
    $show_review = eicr_customer_review_unlocked($user->ID) && !eicr_customer_has_submitted_review($user->ID);
    $include_review_placeholder = !$show_review && !eicr_customer_has_submitted_review($user->ID);
    if ($show_review || $include_review_placeholder) {
        $items["review"] = ["Review", eicr_customer_account_url(["section" => "review"])];
    }
    $links = [];
    foreach ($items as $key => $item) {
        $current = $key === $active ? ' aria-current="page"' : "";
        $review_attributes = $key === "review" ? ' data-review-nav' . ($show_review ? "" : " hidden") : "";
        $links[] = '<a href="' . esc_url($item[1]) . '"' . $current . $review_attributes . '><span class="eicr-app-nav-icon">' . eicr_customer_app_icon($key) . '</span><span>' . esc_html($item[0]) . '</span></a>';
    }
    $name = $user->display_name ?: "Customer";
    return '<aside class="eicr-app-sidebar"><div class="eicr-app-user"><img src="' . esc_url(eicr_customer_avatar_url($user->ID)) . '" alt="' . esc_attr($name) . ' profile photo"><div><strong>' . esc_html($name) . '</strong><span>' . esc_html($user->user_email) . '</span></div></div><nav class="eicr-app-nav" aria-label="Customer account">' . implode("", $links) . "</nav></aside>";
}

function eicr_customer_app_heading($kicker, $title, $description)
{
    return '<header class="eicr-app-heading"><p class="eicr-account-kicker">' . esc_html($kicker) . '</p><h2>' . esc_html($title) . '</h2><p>' . esc_html($description) . '</p></header>';
}

function eicr_customer_download_review_prompt()
{
    if (eicr_customer_has_submitted_review()) {
        return "";
    }
    return '<div id="eicr-certificate-review-prompt" class="eicr-download-review-modal" hidden><div class="eicr-download-review-dialog" role="dialog" aria-modal="true" aria-labelledby="eicr-download-review-title"><button type="button" class="eicr-download-review-close" data-close-modal aria-label="Close">&times;</button><span class="eicr-download-review-check" aria-hidden="true">&#10003;</span><p class="eicr-account-kicker">Download started</p><h2 id="eicr-download-review-title">Thank you for choosing us</h2><p>Your certificate is downloading. We would really appreciate a quick review of your experience.</p><a class="eicr-download-review-action" data-review-prompt-link data-modal-focus href="' . esc_url(eicr_customer_account_url(["section" => "review"])) . '">Leave a review</a><button type="button" class="eicr-download-review-later" data-close-modal>Maybe later</button></div></div>';
}

add_action("wp_enqueue_scripts", function () {
    $content = is_singular() ? (string) get_post_field("post_content", get_queried_object_id()) : "";
    $is_customer_page = is_page(["sign-in", "create-account", "reset-password", "my-account"]) ||
        ($content && preg_match('/\[eicr_customer_(?:sign_in|register|password_reset|dashboard|account)\b/', $content));
    if ($is_customer_page) {
        wp_enqueue_style(
            "eicr-customer-portal",
            EICR_THEME_URI . "/assets/css/customer-portal.css",
            ["eicr-theme"],
            filemtime(EICR_THEME_DIR . "/assets/css/customer-portal.css"),
        );
    }
});

function eicr_auth_settings()
{
    $settings = get_option("eicr_auth_settings", []);
    return is_array($settings) ? $settings : [];
}

function eicr_auth_redirect_uri($provider)
{
    return admin_url("admin-post.php?action=eicr_oauth_callback&provider=" . sanitize_key($provider));
}

function eicr_auth_uses_https()
{
    return is_ssl() || strtolower((string) wp_parse_url(home_url("/"), PHP_URL_SCHEME)) === "https";
}

function eicr_oauth_record_result($provider, $status, $code = "", $message = "")
{
    $provider = sanitize_key($provider);
    if (!in_array($provider, ["google", "apple", "facebook", "microsoft"], true)) {
        $provider = "unknown";
    }
    update_option("eicr_oauth_last_result", [
        "provider" => $provider,
        "status" => sanitize_key($status),
        "code" => sanitize_key($code),
        "message" => function_exists("mb_substr")
            ? mb_substr(sanitize_text_field($message), 0, 240)
            : substr(sanitize_text_field($message), 0, 240),
        "time" => current_time("mysql"),
    ], false);
}

add_action("admin_menu", function () {
    add_submenu_page(
        "eicr-control",
        "Customer & Social Login",
        "Social Login Setup",
        "manage_options",
        "eicr-customer-login",
        "eicr_customer_login_settings_page",
    );
    add_submenu_page(
        "eicr-control",
        "Test Customer Account",
        "Test Customer",
        "manage_options",
        "eicr-test-customer",
        "eicr_test_customer_page",
    );
}, 20);

function eicr_test_customer_email()
{
    return "testcustomer@example.com";
}

function eicr_test_customer_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    $credentials = get_transient("eicr_test_customer_credentials_" . get_current_user_id());
    if (is_array($credentials)) {
        delete_transient("eicr_test_customer_credentials_" . get_current_user_id());
    }
    $existing = get_user_by("email", eicr_test_customer_email());
    ?>
    <div class="wrap eicr-admin-wrap">
        <h1>Test Customer Account</h1>
        <p>Create or reset one safe customer account for checking Sign In, My Account, Account Settings and profile-photo behaviour. It uses a reserved test email and has no real customer bookings.</p>
        <?php if (is_array($credentials)) : ?>
            <div class="notice notice-success inline"><p><strong>Test account is ready. Copy this password now; it will not be shown again.</strong></p></div>
            <table class="widefat striped" style="max-width:720px;margin:18px 0"><tbody><tr><th style="width:180px">Email</th><td><code><?php echo esc_html($credentials["email"]); ?></code></td></tr><tr><th>Password</th><td><code><?php echo esc_html($credentials["password"]); ?></code></td></tr><tr><th>Sign In</th><td><a href="<?php echo esc_url(eicr_customer_sign_in_url()); ?>" target="_blank" rel="noopener">Open customer Sign In</a></td></tr></tbody></table>
        <?php endif; ?>
        <?php if ($existing && !eicr_is_customer_user($existing)) : ?>
            <div class="notice notice-error inline"><p>The reserved test email belongs to another WordPress role, so it was not changed.</p></div>
        <?php else : ?>
            <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>">
                <input type="hidden" name="action" value="eicr_create_test_customer">
                <?php wp_nonce_field("eicr_create_test_customer", "eicr_test_customer_nonce"); ?>
                <?php submit_button($existing ? "Reset test password" : "Create test customer", "primary", "submit", false); ?>
            </form>
            <p class="description"><?php echo $existing ? "Resetting creates a new one-time password and signs out any old test sessions." : "The password is generated securely and shown once on this owner-only page."; ?></p>
        <?php endif; ?>
    </div>
    <?php
}

add_action("admin_post_eicr_create_test_customer", function () {
    if (!current_user_can("manage_options") || !isset($_POST["eicr_test_customer_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_test_customer_nonce"])), "eicr_create_test_customer")) {
        wp_die("You are not authorised to create a test customer.", "Access denied", ["response" => 403]);
    }
    $email = eicr_test_customer_email();
    $user = get_user_by("email", $email);
    if ($user && !eicr_is_customer_user($user)) {
        wp_safe_redirect(admin_url("admin.php?page=eicr-test-customer"));
        exit();
    }
    $password = wp_generate_password(18, true, false);
    if (!$user) {
        $login = "eicr-test-customer";
        $suffix = 1;
        while (username_exists($login)) {
            $login = "eicr-test-customer-" . $suffix++;
        }
        $user_id = wp_insert_user([
            "user_login" => $login,
            "user_email" => $email,
            "user_pass" => $password,
            "display_name" => "Test Customer",
            "role" => "eicr_customer",
        ]);
        if (is_wp_error($user_id)) {
            wp_die("The test customer could not be created.", "Account error", ["response" => 500]);
        }
        $user = get_user_by("id", $user_id);
    } else {
        wp_set_password($password, $user->ID);
    }
    update_user_meta($user->ID, "_eicr_test_customer", "1");
    update_user_meta($user->ID, "_eicr_email_verified", "1");
    update_user_meta($user->ID, "_eicr_email_verified_at", current_time("mysql", true));
    set_transient("eicr_test_customer_credentials_" . get_current_user_id(), ["email" => $email, "password" => $password], 5 * MINUTE_IN_SECONDS);
    wp_safe_redirect(admin_url("admin.php?page=eicr-test-customer"));
    exit();
});

add_action("admin_init", function () {
    register_setting("eicr_auth_settings_group", "eicr_auth_settings", [
        "sanitize_callback" => "eicr_clean_auth_settings",
    ]);
});

function eicr_clean_auth_settings($input)
{
    $old = eicr_auth_settings();
    $out = [];
    foreach (["google_client_id", "facebook_app_id", "microsoft_client_id", "apple_client_id", "apple_team_id", "apple_key_id"] as $key) {
        $out[$key] = sanitize_text_field($input[$key] ?? "");
    }
    foreach (["google_client_secret", "facebook_app_secret", "microsoft_client_secret", "apple_private_key"] as $key) {
        $incoming = trim((string) ($input[$key] ?? ""));
        $out[$key] = $incoming !== "" ? $incoming : ($old[$key] ?? "");
    }
    return $out;
}

function eicr_customer_login_settings_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    $settings = eicr_auth_settings();
    $google_callback = eicr_auth_redirect_uri("google");
    $facebook_callback = eicr_auth_redirect_uri("facebook");
    $microsoft_callback = eicr_auth_redirect_uri("microsoft");
    $apple_callback = eicr_auth_redirect_uri("apple");
    $ready = array_filter(["google", "facebook", "microsoft", "apple"], "eicr_auth_provider_ready");
    $last_result = get_option("eicr_oauth_last_result", []);
    $callback_scheme = strtolower((string) wp_parse_url($google_callback, PHP_URL_SCHEME));
    ?>
    <div class="wrap eicr-admin-wrap">
        <h1>Customer &amp; Social Login</h1>
        <p>Social buttons appear automatically on Sign In and Create Account after that provider's ID and secret are saved. Provider credentials are not included in a WordPress theme; create them in the provider account and register the exact callback shown below.</p>
        <style>
            .eicr-login-status{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 18px}.eicr-login-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 11px;font-weight:700}.eicr-login-ready{background:#dcfce7;color:#166534}.eicr-login-required{background:#fff7ed;color:#9a3412}.eicr-login-card{margin:18px 0;border:1px solid #dcdcde;border-left:4px solid #2271b1;border-radius:4px;background:#fff;padding:2px 18px 12px}.eicr-login-card h2{display:flex;align-items:center;justify-content:space-between;gap:12px}.eicr-login-card code{display:inline-block;max-width:100%;overflow-wrap:anywhere;white-space:normal}.eicr-login-help{margin:8px 0 0;color:#50575e}.eicr-login-result{border-left:4px solid #2271b1;background:#fff;padding:10px 12px}.eicr-login-result.is-error{border-left-color:#d63638}.eicr-login-result.is-success{border-left-color:#00a32a}
        </style>
        <div class="eicr-login-status" aria-label="Social login status">
            <?php foreach (["google" => "Google", "facebook" => "Facebook", "microsoft" => "Microsoft", "apple" => "Apple"] as $provider => $label) : ?>
                <span class="eicr-login-pill <?php echo eicr_auth_provider_ready($provider) ? "eicr-login-ready" : "eicr-login-required"; ?>"><?php echo esc_html($label . ": " . (eicr_auth_provider_ready($provider) ? "Ready" : "Setup required")); ?></span>
            <?php endforeach; ?>
        </div>
        <?php if (!$ready) : ?>
            <div class="notice notice-warning inline"><p><strong>No social provider is active yet.</strong> This is why no social buttons are visible on the public account pages. Configure at least one provider below; Google is the simplest one to start with.</p></div>
        <?php endif; ?>
        <?php if ($callback_scheme !== "https") : ?>
            <div class="notice notice-error inline"><p><strong>HTTPS problem:</strong> WordPress is generating an insecure callback URL. Set both WordPress Address and Site Address to the public HTTPS URL before configuring a provider.</p></div>
        <?php endif; ?>
        <?php if (is_array($last_result) && !empty($last_result["time"])) : ?>
            <p class="eicr-login-result <?php echo ($last_result["status"] ?? "") === "success" ? "is-success" : (($last_result["status"] ?? "") === "failed" ? "is-error" : ""); ?>"><strong>Last social login:</strong> <?php echo esc_html(ucfirst((string) ($last_result["provider"] ?? "unknown")) . " — " . ucfirst((string) ($last_result["status"] ?? "unknown"))); ?><?php if (!empty($last_result["code"])) : ?> (<?php echo esc_html($last_result["code"]); ?>)<?php endif; ?><?php if (!empty($last_result["message"])) : ?> — <?php echo esc_html($last_result["message"]); ?><?php endif; ?> <small><?php echo esc_html((string) $last_result["time"]); ?></small></p>
        <?php endif; ?>
        <form method="post" action="options.php">
            <?php settings_fields("eicr_auth_settings_group"); ?>
            <section class="eicr-login-card"><h2>Google sign-in <span class="eicr-login-pill <?php echo eicr_auth_provider_ready("google") ? "eicr-login-ready" : "eicr-login-required"; ?>"><?php echo eicr_auth_provider_ready("google") ? "Ready" : "Setup required"; ?></span></h2>
            <table class="form-table">
                <tr><th><label for="google_client_id">OAuth Client ID</label></th><td><input class="regular-text" id="google_client_id" name="eicr_auth_settings[google_client_id]" value="<?php echo esc_attr($settings["google_client_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="google_client_secret">OAuth Client Secret</label></th><td><input class="regular-text" type="password" id="google_client_secret" name="eicr_auth_settings[google_client_secret]" value=""><p class="description">Leave blank to keep the saved secret.</p></td></tr>
                <tr><th>Authorised redirect URI</th><td><code><?php echo esc_html($google_callback); ?></code></td></tr>
            </table>
            <p class="eicr-login-help">Create a Web application OAuth client, paste this exact URI under Authorised redirect URIs, then save its Client ID and Client Secret here. <a href="https://developers.google.com/identity/openid-connect/openid-connect" target="_blank" rel="noopener noreferrer">Google setup guide</a>.</p></section>
            <section class="eicr-login-card"><h2>Facebook sign-in <span class="eicr-login-pill <?php echo eicr_auth_provider_ready("facebook") ? "eicr-login-ready" : "eicr-login-required"; ?>"><?php echo eicr_auth_provider_ready("facebook") ? "Ready" : "Setup required"; ?></span></h2>
            <table class="form-table">
                <tr><th><label for="facebook_app_id">App ID</label></th><td><input class="regular-text" id="facebook_app_id" name="eicr_auth_settings[facebook_app_id]" value="<?php echo esc_attr($settings["facebook_app_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="facebook_app_secret">App Secret</label></th><td><input class="regular-text" type="password" id="facebook_app_secret" name="eicr_auth_settings[facebook_app_secret]" value=""><p class="description">Leave blank to keep the saved secret.</p></td></tr>
                <tr><th>Valid OAuth redirect URI</th><td><code><?php echo esc_html($facebook_callback); ?></code></td></tr>
            </table>
            <p class="eicr-login-help">Add Facebook Login to the app, enable Client OAuth Login and Web OAuth Login, and paste this exact URI under Valid OAuth redirect URIs. <a href="https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow" target="_blank" rel="noopener noreferrer">Meta setup guide</a>.</p></section>
            <section class="eicr-login-card"><h2>Microsoft sign-in <span class="eicr-login-pill <?php echo eicr_auth_provider_ready("microsoft") ? "eicr-login-ready" : "eicr-login-required"; ?>"><?php echo eicr_auth_provider_ready("microsoft") ? "Ready" : "Setup required"; ?></span></h2>
            <table class="form-table">
                <tr><th><label for="microsoft_client_id">Application (client) ID</label></th><td><input class="regular-text" id="microsoft_client_id" name="eicr_auth_settings[microsoft_client_id]" value="<?php echo esc_attr($settings["microsoft_client_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="microsoft_client_secret">Client Secret</label></th><td><input class="regular-text" type="password" id="microsoft_client_secret" name="eicr_auth_settings[microsoft_client_secret]" value=""><p class="description">Leave blank to keep the saved secret. Register this as a Web redirect URI.</p></td></tr>
                <tr><th>Redirect URI</th><td><code><?php echo esc_html($microsoft_callback); ?></code></td></tr>
            </table>
            <p class="eicr-login-help">Register this URI under Authentication as a <strong>Web</strong> redirect URI and create a client secret. <a href="https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow" target="_blank" rel="noopener noreferrer">Microsoft setup guide</a>.</p></section>
            <section class="eicr-login-card"><h2>Sign in with Apple <span class="eicr-login-pill <?php echo eicr_auth_provider_ready("apple") ? "eicr-login-ready" : "eicr-login-required"; ?>"><?php echo eicr_auth_provider_ready("apple") ? "Ready" : "Setup required"; ?></span></h2>
            <table class="form-table">
                <tr><th><label for="apple_client_id">Services ID</label></th><td><input class="regular-text" id="apple_client_id" name="eicr_auth_settings[apple_client_id]" value="<?php echo esc_attr($settings["apple_client_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="apple_team_id">Team ID</label></th><td><input class="regular-text" id="apple_team_id" name="eicr_auth_settings[apple_team_id]" value="<?php echo esc_attr($settings["apple_team_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="apple_key_id">Key ID</label></th><td><input class="regular-text" id="apple_key_id" name="eicr_auth_settings[apple_key_id]" value="<?php echo esc_attr($settings["apple_key_id"] ?? ""); ?>"></td></tr>
                <tr><th><label for="apple_private_key">Private key (.p8 contents)</label></th><td><textarea class="large-text code" rows="8" id="apple_private_key" name="eicr_auth_settings[apple_private_key]" placeholder="-----BEGIN PRIVATE KEY-----"></textarea><p class="description">Leave blank to keep the saved private key.</p></td></tr>
                <tr><th>Return URL</th><td><code><?php echo esc_html($apple_callback); ?></code></td></tr>
            </table>
            <p class="eicr-login-help">Configure a Services ID for the website domain, add this exact Return URL, and paste the associated key details here. Apple sign-in also requires PHP OpenSSL. <a href="https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/" target="_blank" rel="noopener noreferrer">Apple setup guide</a>.</p></section>
            <?php submit_button("Save customer login settings"); ?>
        </form>
        <p><strong>WordPress pages:</strong> <a href="<?php echo esc_url(eicr_customer_sign_in_url()); ?>" target="_blank" rel="noopener">Sign In</a> · <a href="<?php echo esc_url(eicr_customer_register_url()); ?>" target="_blank" rel="noopener">Create Account</a> · <a href="<?php echo esc_url(eicr_customer_account_url()); ?>" target="_blank" rel="noopener">My Account</a></p>
    </div>
    <?php
}

function eicr_auth_provider_ready($provider)
{
    $s = eicr_auth_settings();
    if ($provider === "google") {
        return !empty($s["google_client_id"]) && !empty($s["google_client_secret"]);
    }
    if ($provider === "facebook") {
        return !empty($s["facebook_app_id"]) && !empty($s["facebook_app_secret"]);
    }
    if ($provider === "microsoft") {
        return !empty($s["microsoft_client_id"]) && !empty($s["microsoft_client_secret"]);
    }
    if ($provider === "apple") {
        return function_exists("openssl_sign") && function_exists("openssl_verify") && !empty($s["apple_client_id"]) && !empty($s["apple_team_id"]) && !empty($s["apple_key_id"]) && !empty($s["apple_private_key"]);
    }
    return false;
}

function eicr_customer_email_template($heading, $message, $button_label, $url, $footer = "")
{
    $settings = (array) get_option("eicr_settings", []);
    $phone = trim((string) ($settings["phone"] ?? "+44 7878 655350"));
    return '<div style="margin:0;background:#f3f4f6;padding:32px 12px;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:auto;overflow:hidden;border:1px solid #e5e7eb;border-radius:14px;background:#fff"><div style="background:#121826;padding:26px 30px;color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:.15em;color:#f5b642">EICR IN LONDON</div><h1 style="margin:10px 0 0;font-size:26px">' . esc_html($heading) . '</h1></div><div style="padding:28px 30px"><p style="margin-top:0;font-size:15px;line-height:1.7">' . esc_html($message) . '</p><p style="margin:24px 0"><a href="' . esc_url($url) . '" style="display:inline-block;border-radius:9px;background:#c35a2e;padding:13px 20px;color:#fff;text-decoration:none;font-weight:800">' . esc_html($button_label) . '</a></p>' . ($footer ? '<p style="font-size:13px;line-height:1.65;color:#64748b">' . esc_html($footer) . '</p>' : '') . '<p style="margin-bottom:0;font-size:13px;line-height:1.65;color:#64748b">If you did not request this, you can ignore this email. Need help? Call ' . esc_html($phone) . '.</p></div></div></div>';
}

function eicr_send_customer_verification_email($user, $redirect_to = "")
{
    if (!$user instanceof WP_User || !eicr_is_customer_user($user) || !is_email($user->user_email)) {
        return false;
    }
    $token = wp_generate_password(48, false, false);
    $hash = hash_hmac("sha256", $token, wp_salt("auth"));
    $redirect_to = eicr_customer_safe_booking_redirect($redirect_to);
    update_user_meta($user->ID, "_eicr_email_verification_hash", $hash);
    update_user_meta($user->ID, "_eicr_email_verification_expires", time() + DAY_IN_SECONDS);
    update_user_meta($user->ID, "_eicr_email_verification_sent", time());
    $args = [
        "action" => "eicr_verify_customer_email",
        "customer" => $user->ID,
        "token" => $token,
    ];
    if ($redirect_to) {
        $args["redirect_to"] = $redirect_to;
    }
    $url = add_query_arg($args, admin_url("admin-post.php"));
    $body = eicr_customer_email_template(
        "Verify your email address",
        "Confirm this email address to activate your customer account and securely access bookings and certificates.",
        "Verify email",
        $url,
        "This secure link expires after 24 hours.",
    );
    $sent = wp_mail(
        $user->user_email,
        "Verify your EICR in London customer account",
        $body,
        ["Content-Type: text/html; charset=UTF-8"],
    );
    if (!$sent) {
        delete_user_meta($user->ID, "_eicr_email_verification_hash");
        delete_user_meta($user->ID, "_eicr_email_verification_expires");
    }
    return (bool) $sent;
}

add_action("admin_post_nopriv_eicr_verify_customer_email", "eicr_verify_customer_email");
add_action("admin_post_eicr_verify_customer_email", "eicr_verify_customer_email");
function eicr_verify_customer_email()
{
    $user = get_user_by("id", absint($_GET["customer"] ?? 0));
    $token = sanitize_text_field(wp_unslash($_GET["token"] ?? ""));
    $redirect_to = eicr_customer_safe_booking_redirect($_GET["redirect_to"] ?? "");
    $valid = $user &&
        eicr_is_customer_user($user) &&
        $token !== "" &&
        (int) get_user_meta($user->ID, "_eicr_email_verification_expires", true) >= time() &&
        hash_equals(
            (string) get_user_meta($user->ID, "_eicr_email_verification_hash", true),
            hash_hmac("sha256", $token, wp_salt("auth")),
        );
    if (!$valid) {
        eicr_account_redirect(["account_error" => "invalid_verification"], $redirect_to);
    }
    update_user_meta($user->ID, "_eicr_email_verified", "1");
    update_user_meta($user->ID, "_eicr_email_verified_at", current_time("mysql", true));
    delete_user_meta($user->ID, "_eicr_email_verification_hash");
    delete_user_meta($user->ID, "_eicr_email_verification_expires");
    eicr_link_orders_to_customer($user->ID);
    eicr_account_redirect(["account_success" => "email_verified"], $redirect_to);
}

function eicr_account_redirect($args = [], $redirect_to = "")
{
    $redirect_to = eicr_customer_safe_booking_redirect($redirect_to);
    if ($redirect_to) {
        $args["redirect_to"] = $redirect_to;
        $args["login_required"] = "booking";
    }
    wp_safe_redirect(eicr_customer_sign_in_url($args));
    exit();
}

function eicr_registration_redirect($args = [], $redirect_to = "")
{
    $redirect_to = eicr_customer_safe_booking_redirect($redirect_to);
    if ($redirect_to) {
        $args["redirect_to"] = $redirect_to;
        $args["login_required"] = "booking";
    }
    wp_safe_redirect(eicr_customer_register_url($args));
    exit();
}

function eicr_dashboard_redirect($args = [])
{
    wp_safe_redirect(eicr_customer_account_url($args));
    exit();
}

function eicr_customer_notice()
{
    $error = sanitize_key($_GET["account_error"] ?? "");
    $success = sanitize_key($_GET["account_success"] ?? "");
    $errors = [
        "invalid_login" => "We could not sign you in. Please check your email and password.",
        "no_account" => "No account found for this email address.",
        "wrong_password" => "Wrong password. Please try again or reset your password.",
        "invalid_registration" => "Please enter your name, a valid email and a password of at least 8 characters.",
        "invalid_captcha" => "The CAPTCHA answer was incorrect or expired. Please try the new question.",
        "email_exists" => "An account already exists for this email. Please sign in or reset your password.",
        "customer_required" => "Customer pages use a separate customer account. Please sign in with a customer email.",
        "verification_required" => "Please verify your email address before signing in. A new verification link will be sent after you enter the correct password.",
        "invalid_verification" => "That email-verification link is invalid or has expired. Sign in with your password to receive a new link.",
        "verification_failed" => "We could not send the verification email. Please try again shortly or contact us for help.",
        "invalid_reset" => "That password-reset link is invalid or has expired. Please request a new link.",
        "oauth_unavailable" => "That social sign-in option has not been configured yet. Please use your website account.",
        "oauth_failed" => "Social sign-in could not be completed. Please try again or use your website account.",
        "too_many_attempts" => "Too many account attempts were received. Please wait 15 minutes and try again.",
        "settings_invalid" => "Please check the account settings and try again.",
        "profile_image" => "Please choose a genuine JPG, PNG or WebP image no larger than 3 MB.",
        "password_mismatch" => "The new passwords did not match or were shorter than 8 characters.",
    ];
    $successes = [
        "registered" => "Your account has been created. Your bookings and certificates are ready in this dashboard.",
        "settings_saved" => "Your account settings have been saved.",
        "verification_sent" => "Check your email and use the verification link to activate your customer account.",
        "email_verified" => "Your email address has been verified. You can now sign in securely.",
        "reset_link_sent" => "If a matching customer account exists, a secure password-reset link has been sent.",
        "password_reset" => "Your password has been changed. You can now sign in.",
    ];
    if (isset($errors[$error])) {
        return '<div class="eicr-account-notice eicr-account-error" role="alert">' . esc_html($errors[$error]) . "</div>";
    }
    if (isset($successes[$success])) {
        return '<div class="eicr-account-notice eicr-account-success" role="status">' . esc_html($successes[$success]) . "</div>";
    }
    return "";
}

function eicr_customer_account_shortcode()
{
    return eicr_customer_dashboard_shortcode();
}
add_shortcode("eicr_customer_account", "eicr_customer_account_shortcode");

function eicr_customer_sign_in_shortcode()
{
    if (eicr_is_verified_customer_user()) {
        return '<div class="eicr-account-notice eicr-account-success" role="status">You are already signed in. <a href="' . esc_url(eicr_customer_account_url()) . '">Open My Account</a>.</div>';
    }
    return eicr_customer_login_screen();
}
add_shortcode("eicr_customer_sign_in", "eicr_customer_sign_in_shortcode");

function eicr_customer_register_shortcode()
{
    if (eicr_is_verified_customer_user()) {
        return '<div class="eicr-account-notice eicr-account-success" role="status">Your customer account is active. <a href="' . esc_url(eicr_customer_account_url()) . '">Open My Account</a>.</div>';
    }
    return eicr_customer_registration_screen();
}
add_shortcode("eicr_customer_register", "eicr_customer_register_shortcode");

function eicr_customer_password_reset_redirect($args = [])
{
    wp_safe_redirect(eicr_customer_password_reset_url($args));
    exit();
}

function eicr_customer_password_reset_shortcode()
{
    if (eicr_is_verified_customer_user()) {
        return '<div class="eicr-account-notice eicr-account-success" role="status">You are already signed in. <a href="' . esc_url(eicr_customer_account_url()) . '">Open My Account</a>.</div>';
    }
    $key = sanitize_text_field(wp_unslash($_GET["key"] ?? ""));
    $login = sanitize_user(wp_unslash($_GET["login"] ?? ""), true);
    $reset_user = $key && $login ? check_password_reset_key($key, $login) : null;
    ob_start();
    ?>
    <div class="eicr-account-shell eicr-auth-shell">
        <?php echo eicr_customer_notice(); ?>
        <section class="eicr-auth-card eicr-auth-card-single">
            <?php if ($key && $login && $reset_user instanceof WP_User && eicr_is_customer_user($reset_user)) : ?>
                <h3>Choose a new password</h3>
                <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-account-form">
                    <input type="hidden" name="action" value="eicr_customer_reset_password">
                    <input type="hidden" name="key" value="<?php echo esc_attr($key); ?>">
                    <input type="hidden" name="login" value="<?php echo esc_attr($login); ?>">
                    <?php wp_nonce_field("eicr_customer_reset_password", "eicr_customer_reset_nonce"); ?>
                    <label>New password<input type="password" name="new_password" minlength="8" autocomplete="new-password" required><small>Use at least 8 characters.</small></label>
                    <label>Confirm new password<input type="password" name="confirm_password" minlength="8" autocomplete="new-password" required></label>
                    <button type="submit">Save new password</button>
                </form>
            <?php elseif ($key || $login) : ?>
                <h3>Reset link expired</h3>
                <p>This secure password-reset link is invalid or has expired.</p>
                <a class="eicr-auth-primary-link" href="<?php echo esc_url(eicr_customer_password_reset_url()); ?>">Request a new link</a>
            <?php else : ?>
                <h3>Reset your password</h3>
                <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-account-form">
                    <input type="hidden" name="action" value="eicr_customer_request_reset">
                    <?php wp_nonce_field("eicr_customer_request_reset", "eicr_customer_reset_nonce"); ?>
                    <label>Email address<input type="email" name="email" autocomplete="email" required></label>
                    <button type="submit">Send reset link</button>
                </form>
                <div class="eicr-auth-switch"><span>Remembered your password?</span><a href="<?php echo esc_url(eicr_customer_sign_in_url()); ?>">Sign in</a></div>
            <?php endif; ?>
        </section>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode("eicr_customer_password_reset", "eicr_customer_password_reset_shortcode");

add_action("admin_post_nopriv_eicr_customer_request_reset", "eicr_customer_request_reset");
add_action("admin_post_eicr_customer_request_reset", "eicr_customer_request_reset");
function eicr_customer_request_reset()
{
    if (!isset($_POST["eicr_customer_reset_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_customer_reset_nonce"])), "eicr_customer_request_reset")) {
        eicr_customer_password_reset_redirect(["account_error" => "invalid_reset"]);
    }
    if (!eicr_customer_rate_limit("password_reset", 6, 15 * MINUTE_IN_SECONDS)) {
        eicr_customer_password_reset_redirect(["account_error" => "too_many_attempts"]);
    }
    $email = sanitize_email(wp_unslash($_POST["email"] ?? ""));
    $user = $email ? get_user_by("email", $email) : false;
    if ($user && eicr_is_customer_user($user)) {
        $key = get_password_reset_key($user);
        if (!is_wp_error($key)) {
            $url = eicr_customer_password_reset_url([
                "key" => $key,
                "login" => $user->user_login,
            ]);
            $body = eicr_customer_email_template(
                "Reset your password",
                "Use the secure link below to choose a new password for your customer account.",
                "Reset password",
                $url,
                "This link is single-use and expires automatically.",
            );
            wp_mail(
                $user->user_email,
                "Reset your EICR in London password",
                $body,
                ["Content-Type: text/html; charset=UTF-8"],
            );
        }
    }
    eicr_customer_password_reset_redirect(["account_success" => "reset_link_sent"]);
}

add_action("admin_post_nopriv_eicr_customer_reset_password", "eicr_customer_reset_password");
add_action("admin_post_eicr_customer_reset_password", "eicr_customer_reset_password");
function eicr_customer_reset_password()
{
    $key = sanitize_text_field(wp_unslash($_POST["key"] ?? ""));
    $login = sanitize_user(wp_unslash($_POST["login"] ?? ""), true);
    $redirect_args = ["key" => $key, "login" => $login];
    if (!isset($_POST["eicr_customer_reset_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_customer_reset_nonce"])), "eicr_customer_reset_password")) {
        $redirect_args["account_error"] = "invalid_reset";
        eicr_customer_password_reset_redirect($redirect_args);
    }
    $user = check_password_reset_key($key, $login);
    $password = (string) wp_unslash($_POST["new_password"] ?? "");
    $confirmation = (string) wp_unslash($_POST["confirm_password"] ?? "");
    if (!$user instanceof WP_User || !eicr_is_customer_user($user)) {
        $redirect_args["account_error"] = "invalid_reset";
        eicr_customer_password_reset_redirect($redirect_args);
    }
    if (strlen($password) < 8 || !hash_equals($password, $confirmation)) {
        $redirect_args["account_error"] = "password_mismatch";
        eicr_customer_password_reset_redirect($redirect_args);
    }
    reset_password($user, $password);
    update_user_meta($user->ID, "_eicr_email_verified", "1");
    update_user_meta($user->ID, "_eicr_email_verified_at", current_time("mysql", true));
    eicr_link_orders_to_customer($user->ID);
    wp_safe_redirect(eicr_customer_sign_in_url(["account_success" => "password_reset"]));
    exit();
}

function eicr_customer_dashboard_shortcode()
{
    if (!eicr_is_verified_customer_user()) {
        return '<div class="eicr-account-shell"><div class="eicr-empty-account"><h3>Customer sign-in required</h3><p>Sign in to view your bookings, job progress and completed certificates.</p><a href="' . esc_url(eicr_customer_sign_in_url()) . '">Sign in</a></div></div>';
    }
    return eicr_customer_dashboard();
}
add_shortcode("eicr_customer_dashboard", "eicr_customer_dashboard_shortcode");

function eicr_social_buttons_html($redirect_to = "", $verb = "Continue")
{
    $providers = [
        "google" => ["Google", '<span class="eicr-social-mark eicr-google-mark" aria-hidden="true">G</span>'],
        "apple" => ["Apple", '<span class="eicr-social-mark eicr-apple-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16.7 12.6c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.6-2.9-1.6-1.3-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7s1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4-.1 0-2.5-1-2.5-3zM14.7 6.6c.6-.7 1-1.8.9-2.8-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.7-1 2.7 1 .1 2.1-.5 2.8-1.2z"/></svg></span>'],
        "facebook" => ["Facebook", '<span class="eicr-social-mark eicr-facebook-mark" aria-hidden="true">f</span>'],
        "microsoft" => ["Microsoft", '<span class="eicr-social-mark eicr-microsoft-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'],
    ];
    $links = "";
    foreach ($providers as $provider => $details) {
        if (!eicr_auth_provider_ready($provider)) {
            continue;
        }
        $args = ["action" => "eicr_social_login", "provider" => $provider];
        if ($redirect_to) {
            $args["redirect_to"] = $redirect_to;
        }
        $url = add_query_arg($args, admin_url("admin-post.php"));
        $links .= '<a class="eicr-social-button eicr-' . esc_attr($provider) . '" href="' . esc_url($url) . '">' . $details[1] . esc_html($verb . " " . $details[0]) . '</a>';
    }
    if ($links === "") {
        return "";
    }
    return '<div class="eicr-auth-divider"><span>or use a connected account</span></div><div class="eicr-social-buttons">' . $links . '</div>';
}

function eicr_customer_captcha_field()
{
    $first = wp_rand(2, 9);
    $second = wp_rand(2, 9);
    $token = wp_generate_password(32, false, false);
    $fingerprint = function_exists("eicr_public_request_fingerprint")
        ? eicr_public_request_fingerprint()
        : hash_hmac("sha256", sanitize_text_field(wp_unslash($_SERVER["REMOTE_ADDR"] ?? "unknown")), wp_salt("nonce"));
    set_transient("eicr_customer_captcha_" . hash("sha256", $token), [
        "answer" => $first + $second,
        "fingerprint" => $fingerprint,
    ], 10 * MINUTE_IN_SECONDS);
    return '<input type="hidden" name="captcha_token" value="' . esc_attr($token) . '"><label>Security check: What is ' . esc_html($first) . ' + ' . esc_html($second) . '?<input type="number" name="captcha_answer" inputmode="numeric" min="0" max="30" autocomplete="off" required><small>This single-use CAPTCHA expires after 10 minutes.</small></label>';
}

function eicr_customer_captcha_valid($token, $answer)
{
    $token = sanitize_text_field(wp_unslash($token));
    $key = "eicr_customer_captcha_" . hash("sha256", $token);
    $record = $token ? get_transient($key) : false;
    delete_transient($key);
    if (!is_array($record)) {
        return false;
    }
    $fingerprint = function_exists("eicr_public_request_fingerprint")
        ? eicr_public_request_fingerprint()
        : hash_hmac("sha256", sanitize_text_field(wp_unslash($_SERVER["REMOTE_ADDR"] ?? "unknown")), wp_salt("nonce"));
    return hash_equals((string) ($record["fingerprint"] ?? ""), (string) $fingerprint) &&
        (int) $answer === (int) ($record["answer"] ?? -1);
}

function eicr_customer_login_screen()
{
    $redirect_to = eicr_customer_safe_booking_redirect($_GET["redirect_to"] ?? "");
    $register_args = $redirect_to ? ["redirect_to" => $redirect_to, "login_required" => "booking"] : [];
    ob_start();
    ?>
    <div class="eicr-account-shell eicr-auth-shell">
        <?php echo eicr_customer_notice(); ?>
        <section class="eicr-auth-card eicr-auth-card-single">
            <h3>Sign in</h3>
            <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-account-form">
                <input type="hidden" name="action" value="eicr_customer_login">
                <input type="hidden" name="redirect_to" value="<?php echo esc_attr($redirect_to); ?>">
                <?php wp_nonce_field("eicr_customer_login", "eicr_customer_nonce"); ?>
                <label>Email address<input type="email" name="email" autocomplete="email" required></label>
                <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
                <button type="submit">Sign in securely</button>
                <a class="eicr-forgot" href="<?php echo esc_url(eicr_customer_password_reset_url()); ?>">Forgotten your password?</a>
            </form>
            <?php echo eicr_social_buttons_html($redirect_to, "Continue with"); ?>
            <div class="eicr-auth-switch"><span>Do not have an account?</span><a href="<?php echo esc_url(eicr_customer_register_url($register_args)); ?>">Create New Account</a></div>
        </section>
    </div>
    <?php
    return ob_get_clean();
}

function eicr_customer_registration_screen()
{
    $redirect_to = eicr_customer_safe_booking_redirect($_GET["redirect_to"] ?? "");
    $sign_in_args = $redirect_to ? ["redirect_to" => $redirect_to, "login_required" => "booking"] : [];
    ob_start();
    ?>
    <div class="eicr-account-shell eicr-auth-shell">
        <?php echo eicr_customer_notice(); ?>
        <section class="eicr-auth-card eicr-auth-card-single">
            <h3>Create New Account</h3>
            <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-account-form">
                <input type="hidden" name="action" value="eicr_customer_register">
                <input type="hidden" name="redirect_to" value="<?php echo esc_attr($redirect_to); ?>">
                <?php wp_nonce_field("eicr_customer_register", "eicr_customer_nonce"); ?>
                <label>Full name<input type="text" name="name" autocomplete="name" required></label>
                <label>Email address<input type="email" name="email" autocomplete="email" required></label>
                <label>Password<input type="password" name="password" minlength="8" autocomplete="new-password" required><small>Use at least 8 characters.</small></label>
                <?php echo eicr_customer_captcha_field(); ?>
                <button type="submit">Create customer account</button>
            </form>
            <?php echo eicr_social_buttons_html($redirect_to, "Create account with"); ?>
            <p class="eicr-auth-legal">By creating or connecting an account, you agree to our <a href="<?php echo esc_url(home_url("/terms/")); ?>">Terms</a> and acknowledge our <a href="<?php echo esc_url(home_url("/privacy/")); ?>">Privacy Policy</a>.</p>
            <div class="eicr-auth-switch"><span>Already have an account?</span><a href="<?php echo esc_url(eicr_customer_sign_in_url($sign_in_args)); ?>">Sign in</a></div>
        </section>
    </div>
    <?php
    return ob_get_clean();
}

add_action("admin_post_nopriv_eicr_customer_login", "eicr_customer_login_submit");
add_action("admin_post_eicr_customer_login", "eicr_customer_login_submit");
function eicr_customer_rate_limit($action, $limit, $window)
{
    $fingerprint = function_exists("eicr_public_request_fingerprint")
        ? eicr_public_request_fingerprint()
        : hash_hmac("sha256", sanitize_text_field(wp_unslash($_SERVER["REMOTE_ADDR"] ?? "unknown")), wp_salt("nonce"));
    $key = "eicr_customer_rl_" . sanitize_key($action) . "_" . substr($fingerprint, 0, 32);
    $record = get_transient($key);
    $count = is_array($record) ? (int) ($record["count"] ?? 0) : 0;
    $count++;
    set_transient($key, ["count" => $count], max(MINUTE_IN_SECONDS, (int) $window));
    return $count <= (int) $limit;
}

function eicr_customer_login_submit()
{
    $redirect_to = eicr_customer_safe_booking_redirect($_POST["redirect_to"] ?? "");
    if (!isset($_POST["eicr_customer_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_customer_nonce"])), "eicr_customer_login")) {
        eicr_account_redirect(["account_error" => "invalid_login"], $redirect_to);
    }
    if (!eicr_customer_rate_limit("login", 20, 15 * MINUTE_IN_SECONDS)) {
        eicr_account_redirect(["account_error" => "too_many_attempts"], $redirect_to);
    }
    $email = sanitize_email(wp_unslash($_POST["email"] ?? ""));
    $password = (string) wp_unslash($_POST["password"] ?? "");
    $candidate = $email ? get_user_by("email", $email) : false;
    if (!$candidate) {
        eicr_account_redirect(["account_error" => "no_account"], $redirect_to);
    }
    if (!wp_check_password($password, $candidate->user_pass, $candidate->ID)) {
        eicr_account_redirect(["account_error" => "wrong_password"], $redirect_to);
    }
    if (function_exists("eicr_has_staff_role") && eicr_has_staff_role($candidate)) {
        if (function_exists("eicr_staff_begin_login")) {
            $staff_result = eicr_staff_begin_login($candidate);
            $staff_notice = is_wp_error($staff_result) ? $staff_result->get_error_code() : "verification_failed";
            wp_safe_redirect(eicr_staff_login_url(["staff_notice" => $staff_notice]));
            exit();
        }
        eicr_account_redirect(["account_error" => "customer_required"], $redirect_to);
    }
    if (!eicr_is_customer_user($candidate)) {
        eicr_account_redirect(["account_error" => "customer_required"], $redirect_to);
    }
    $user = wp_signon([
        "user_login" => $candidate->user_login,
        "user_password" => $password,
        "remember" => false,
    ], is_ssl());
    if (is_wp_error($user)) {
        eicr_account_redirect(["account_error" => "invalid_login"], $redirect_to);
    }
    if (!eicr_is_customer_user($user)) {
        wp_clear_auth_cookie();
        eicr_account_redirect(["account_error" => "invalid_login"], $redirect_to);
    }
    if (!eicr_customer_email_verified($user)) {
        wp_clear_auth_cookie();
        $sent = eicr_send_customer_verification_email($user, $redirect_to);
        $notice = $sent
            ? ["account_success" => "verification_sent"]
            : ["account_error" => "verification_failed"];
        eicr_account_redirect($notice, $redirect_to);
    }
    eicr_link_orders_to_customer($user->ID);
    if ($redirect_to) {
        wp_safe_redirect($redirect_to);
        exit();
    }
    eicr_account_redirect();
}

add_action("admin_post_nopriv_eicr_customer_register", "eicr_customer_register_submit");
add_action("admin_post_eicr_customer_register", "eicr_customer_register_submit");
function eicr_customer_register_submit()
{
    $redirect_to = eicr_customer_safe_booking_redirect($_POST["redirect_to"] ?? "");
    if (!isset($_POST["eicr_customer_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_customer_nonce"])), "eicr_customer_register")) {
        eicr_registration_redirect(["account_error" => "invalid_registration"], $redirect_to);
    }
    if (!eicr_customer_rate_limit("registration", 5, 15 * MINUTE_IN_SECONDS)) {
        eicr_registration_redirect(["account_error" => "too_many_attempts"], $redirect_to);
    }
    $name = sanitize_text_field(wp_unslash($_POST["name"] ?? ""));
    $email = sanitize_email(wp_unslash($_POST["email"] ?? ""));
    $password = (string) wp_unslash($_POST["password"] ?? "");
    if (!$name || !is_email($email) || strlen($password) < 8) {
        eicr_registration_redirect(["account_error" => "invalid_registration"], $redirect_to);
    }
    if (!eicr_customer_captcha_valid($_POST["captcha_token"] ?? "", $_POST["captcha_answer"] ?? "")) {
        eicr_registration_redirect(["account_error" => "invalid_captcha"], $redirect_to);
    }
    if (email_exists($email)) {
        eicr_registration_redirect(["account_error" => "email_exists"], $redirect_to);
    }
    $base = sanitize_user(strstr($email, "@", true), true) ?: "customer";
    $login = $base;
    $number = 1;
    while (username_exists($login)) {
        $login = $base . $number;
        $number++;
    }
    $user_id = wp_insert_user([
        "user_login" => $login,
        "user_email" => $email,
        "user_pass" => $password,
        "display_name" => $name,
        "role" => "eicr_customer",
    ]);
    if (is_wp_error($user_id)) {
        eicr_registration_redirect(["account_error" => "invalid_registration"], $redirect_to);
    }
    update_user_meta($user_id, "_eicr_terms_accepted_at", current_time("mysql", true));
    update_user_meta($user_id, "_eicr_terms_version", "2026-08-07");
    $user = get_user_by("id", $user_id);
    if (!$user || !eicr_send_customer_verification_email($user, $redirect_to)) {
        require_once ABSPATH . "wp-admin/includes/user.php";
        wp_delete_user($user_id);
        eicr_registration_redirect(["account_error" => "verification_failed"], $redirect_to);
    }
    eicr_account_redirect(["account_success" => "verification_sent"], $redirect_to);
}

function eicr_assign_order_customer($order_id, $data)
{
    $email = sanitize_email($data["email"] ?? "");
    if (!$order_id || !$email) {
        return 0;
    }
    $user = get_user_by("email", $email);
    if ($user && !eicr_is_customer_user($user)) {
        return new WP_Error("social_role", "This email belongs to a non-customer WordPress account and cannot be linked automatically.");
    }
    if (!$user) {
        return 0;
    }
    update_post_meta($order_id, "_eicr_customer_user_id", (int) $user->ID);
    return (int) $user->ID;
}

function eicr_link_orders_to_customer($user_id)
{
    $user = get_user_by("id", absint($user_id));
    if (!$user) {
        return;
    }
    $orders = get_posts([
        "post_type" => "eicr_order",
        "post_status" => "publish",
        "numberposts" => -1,
        "fields" => "ids",
        "meta_query" => [["key" => "_eicr_data", "value" => $user->user_email, "compare" => "LIKE"]],
    ]);
    foreach ($orders as $order_id) {
        $data = eicr_order_data($order_id);
        if (!empty($data["email"]) && strtolower($data["email"]) === strtolower($user->user_email)) {
            update_post_meta($order_id, "_eicr_customer_user_id", (int) $user->ID);
        }
    }
}

function eicr_customer_orders($user_id)
{
    eicr_link_orders_to_customer($user_id);
    return get_posts([
        "post_type" => "eicr_order",
        "post_status" => "publish",
        "numberposts" => -1,
        "orderby" => "date",
        "order" => "DESC",
        "meta_key" => "_eicr_customer_user_id",
        "meta_value" => absint($user_id),
    ]);
}

function eicr_certificate_slots($order_id, $data = null)
{
    $data = is_array($data) ? $data : eicr_order_data($order_id);
    $names = function_exists("eicr_order_service_names") ? eicr_order_service_names($data) : (array) ($data["services"] ?? []);
    $slots = [];
    foreach (array_values($names) as $index => $name) {
        $name = sanitize_text_field($name);
        $slots[] = [
            "key" => "service-" . ($index + 1) . "-" . substr(md5($name), 0, 10),
            "name" => $name,
        ];
    }
    return $slots;
}

function eicr_order_certificates($order_id)
{
    $certificates = get_post_meta($order_id, "_eicr_certificates", true);
    return is_array($certificates) ? $certificates : [];
}

function eicr_order_payment_cleared($order_id, $data = null)
{
    $data = is_array($data) ? $data : eicr_order_data($order_id);
    return strtolower(trim((string) ($data["status"] ?? ""))) === "paid";
}

function eicr_booking_tracking_status($data)
{
    $data = is_array($data) ? $data : [];
    $confirmed = strtolower(trim((string) ($data["booking_status"] ?? ""))) === "confirmed";
    return [
        "is_confirmed" => $confirmed,
        "label" => $confirmed ? "Booking Confirmed" : "Awaiting Booking Confirmation",
    ];
}

function eicr_job_progress($order_id, $data = null)
{
    $slots = eicr_certificate_slots($order_id, $data);
    $certificates = eicr_order_certificates($order_id);
    $complete = 0;
    foreach ($slots as $slot) {
        if (!empty($certificates[$slot["key"]]["relative_path"])) {
            $complete++;
        }
    }
    $total = count($slots);
    return [
        "complete" => $complete,
        "total" => $total,
        "is_complete" => $total > 0 && $complete === $total,
        "label" => $total > 0 && $complete === $total ? "Completed" : ($complete > 0 ? "In progress" : "Awaiting certificates"),
    ];
}

function eicr_customer_can_access_order($order_id, $user_id = 0)
{
    $user_id = $user_id ?: get_current_user_id();
    if (!$user_id || get_post_type($order_id) !== "eicr_order") {
        return false;
    }
    if (user_can($user_id, "manage_options")) {
        return true;
    }
    $user = get_user_by("id", $user_id);
    if (function_exists("eicr_staff_portal_access") && (int) $user_id === (int) get_current_user_id() && eicr_staff_portal_access()) {
        return true;
    }
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user($user)) {
        return false;
    }
    if ((int) get_post_meta($order_id, "_eicr_customer_user_id", true) === (int) $user_id) {
        return true;
    }
    $data = eicr_order_data($order_id);
    if ($user && !empty($data["email"]) && strtolower($data["email"]) === strtolower($user->user_email)) {
        update_post_meta($order_id, "_eicr_customer_user_id", (int) $user_id);
        return true;
    }
    return false;
}

function eicr_certificate_download_url($order_id, $service_key)
{
    return wp_nonce_url(
        admin_url("admin-post.php?action=eicr_download_certificate&order_id=" . absint($order_id) . "&service_key=" . rawurlencode($service_key)),
        "eicr_download_certificate_" . absint($order_id) . "_" . $service_key,
    );
}

function eicr_customer_setting_value($user_id, $key)
{
    return (string) get_user_meta($user_id, "_eicr_profile_" . sanitize_key($key), true);
}

function eicr_customer_connected_accounts($user_id)
{
    $labels = [];
    foreach (["google" => "Google", "facebook" => "Facebook", "microsoft" => "Microsoft", "apple" => "Apple"] as $provider => $label) {
        if (get_user_meta($user_id, "_eicr_" . $provider . "_sub", true)) {
            $labels[] = $label;
        }
    }
    return $labels;
}

function eicr_customer_settings_screen()
{
    $user = wp_get_current_user();
    $connected = eicr_customer_connected_accounts($user->ID);
    $photo_source = (string) get_user_meta($user->ID, "_eicr_profile_photo_source", true);
    $contact = eicr_customer_setting_value($user->ID, "contact_preference") ?: "email";
    $reminders = get_user_meta($user->ID, "_eicr_profile_appointment_reminders", true) !== "0";
    ob_start();
    ?>
    <div class="eicr-account-shell">
        <?php echo eicr_customer_notice(); ?>
        <div class="eicr-account-app">
            <?php echo eicr_customer_account_navigation("profile"); ?>
            <section class="eicr-app-panel">
                <?php echo eicr_customer_app_heading("Your account", "Profile", "Update your photo, contact details and sign-in security."); ?>
                <form method="post" enctype="multipart/form-data" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-settings-form">
                    <input type="hidden" name="action" value="eicr_customer_save_settings">
                    <?php wp_nonce_field("eicr_customer_save_settings", "eicr_customer_settings_nonce"); ?>
                    <section class="eicr-settings-card eicr-photo-settings">
                        <div class="eicr-photo-preview-wrap"><img data-profile-photo-preview src="<?php echo esc_url(eicr_customer_avatar_url($user->ID)); ?>" alt="Current profile photo"></div>
                        <div class="eicr-photo-copy"><h3>Profile photo</h3><p>Add a JPG, PNG or WebP image up to 3 MB. It will also appear in the desktop account icon.</p><?php if ($photo_source === "google") : ?><small>Your current image came from Google. A photo you upload here will replace it.</small><?php endif; ?><div class="eicr-photo-actions"><label class="eicr-photo-upload-button"><span>Upload photo</span><input data-profile-photo-input type="file" name="profile_photo" accept="image/jpeg,image/png,image/webp"></label><?php if ($photo_source) : ?><label class="eicr-remove-photo"><input type="checkbox" name="remove_photo" value="1"> Remove photo</label><?php endif; ?></div></div>
                    </section>
                    <section class="eicr-settings-card">
                        <div class="eicr-settings-title"><h3>Personal details</h3><p>Used for appointment and certificate communication.</p></div>
                        <div class="eicr-settings-grid">
                            <label>Full name<input type="text" name="display_name" value="<?php echo esc_attr($user->display_name); ?>" autocomplete="name" required maxlength="100"></label>
                            <label>Email address<input type="email" value="<?php echo esc_attr($user->user_email); ?>" readonly><small>Contact us if this email needs to be changed.</small></label>
                            <label>Phone number<input type="tel" name="phone" value="<?php echo esc_attr(eicr_customer_setting_value($user->ID, "phone")); ?>" autocomplete="tel" maxlength="40"></label>
                            <label>Preferred contact<select name="contact_preference"><option value="email" <?php selected($contact, "email"); ?>>Email</option><option value="phone" <?php selected($contact, "phone"); ?>>Phone</option><option value="whatsapp" <?php selected($contact, "whatsapp"); ?>>WhatsApp</option></select></label>
                            <label class="eicr-settings-wide">Address<input type="text" name="address" value="<?php echo esc_attr(eicr_customer_setting_value($user->ID, "address")); ?>" autocomplete="street-address" maxlength="180"></label>
                            <label>Town or city<input type="text" name="city" value="<?php echo esc_attr(eicr_customer_setting_value($user->ID, "city")); ?>" autocomplete="address-level2" maxlength="100"></label>
                            <label>Postcode<input type="text" name="postcode" value="<?php echo esc_attr(eicr_customer_setting_value($user->ID, "postcode")); ?>" autocomplete="postal-code" maxlength="12"></label>
                        </div>
                        <label class="eicr-settings-check"><input type="checkbox" name="appointment_reminders" value="1" <?php checked($reminders); ?>> Send service and appointment reminders when available.</label>
                    </section>
                    <section class="eicr-settings-card">
                        <div class="eicr-settings-title"><h3>Password</h3><p>Leave these fields blank unless you want to change it.</p></div>
                        <div class="eicr-settings-grid">
                            <label>New password<input type="password" name="new_password" minlength="8" autocomplete="new-password"><small>Use at least 8 characters.</small></label>
                            <label>Confirm password<input type="password" name="confirm_password" minlength="8" autocomplete="new-password"></label>
                        </div>
                        <p class="eicr-connected-account"><strong>Connected sign-in:</strong> <?php echo esc_html($connected ? implode(", ", $connected) : "Email and password"); ?></p>
                    </section>
                    <button class="eicr-save-settings" type="submit">Save changes</button>
                </form>
                <section class="eicr-settings-signout"><div><strong>Sign out of this device</strong><span>You will need to sign in again to access your account.</span></div><a href="<?php echo esc_url(eicr_customer_logout_url()); ?>">Sign out</a></section>
            </section>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

add_action("admin_post_eicr_customer_save_settings", "eicr_customer_save_settings");
function eicr_customer_save_settings()
{
    if (!eicr_is_verified_customer_user() || !isset($_POST["eicr_customer_settings_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_customer_settings_nonce"])), "eicr_customer_save_settings")) {
        wp_die("You are not authorised to update these account settings.", "Access denied", ["response" => 403]);
    }
    $user_id = get_current_user_id();
    $name = sanitize_text_field(wp_unslash($_POST["display_name"] ?? ""));
    if ($name === "") {
        eicr_dashboard_redirect(["section" => "profile", "account_error" => "settings_invalid"]);
    }
    $password = (string) wp_unslash($_POST["new_password"] ?? "");
    $confirmation = (string) wp_unslash($_POST["confirm_password"] ?? "");
    if ($password !== "" && (strlen($password) < 8 || !hash_equals($password, $confirmation))) {
        eicr_dashboard_redirect(["section" => "profile", "account_error" => "password_mismatch"]);
    }
    wp_update_user(["ID" => $user_id, "display_name" => $name]);
    $values = [
        "phone" => sanitize_text_field(wp_unslash($_POST["phone"] ?? "")),
        "address" => sanitize_text_field(wp_unslash($_POST["address"] ?? "")),
        "city" => sanitize_text_field(wp_unslash($_POST["city"] ?? "")),
        "postcode" => strtoupper(sanitize_text_field(wp_unslash($_POST["postcode"] ?? ""))),
    ];
    $contact = sanitize_key($_POST["contact_preference"] ?? "email");
    $values["contact_preference"] = in_array($contact, ["email", "phone", "whatsapp"], true) ? $contact : "email";
    foreach ($values as $key => $value) {
        update_user_meta($user_id, "_eicr_profile_" . $key, $value);
    }
    update_user_meta($user_id, "_eicr_profile_appointment_reminders", isset($_POST["appointment_reminders"]) ? "1" : "0");
    $file = $_FILES["profile_photo"] ?? [];
    $has_photo_upload = !empty($file) && (int) ($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
    if ($has_photo_upload) {
        if ((int) ($file["error"] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            eicr_dashboard_redirect(["section" => "profile", "account_error" => "profile_image"]);
        }
        $stored = eicr_customer_store_profile_photo($user_id, $file["tmp_name"] ?? "", $file["name"] ?? "profile.jpg", "custom", true);
        if (is_wp_error($stored)) {
            eicr_dashboard_redirect(["section" => "profile", "account_error" => "profile_image"]);
        }
    } elseif (isset($_POST["remove_photo"])) {
        eicr_customer_delete_profile_photo($user_id);
    }
    if ($password !== "") {
        wp_set_password($password, $user_id);
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true, is_ssl());
    }
    eicr_dashboard_redirect(["section" => "profile", "account_success" => "settings_saved"]);
}

function eicr_customer_dashboard()
{
    $section = sanitize_key($_GET["section"] ?? "overview");
    if ($section === "settings") {
        $section = "profile";
    }
    if ($section === "profile") {
        return eicr_customer_settings_screen();
    }
    if (!in_array($section, ["overview", "bookings", "certificates", "review"], true)) {
        $section = "overview";
    }
    $user = wp_get_current_user();
    if ($section === "review" && (!eicr_customer_review_unlocked($user->ID) || eicr_customer_has_submitted_review($user->ID))) {
        $section = "overview";
    }
    $orders = eicr_customer_orders($user->ID);
    $ready = 0;
    foreach ($orders as $order) {
        $data = eicr_order_data($order->ID);
        if (eicr_order_payment_cleared($order->ID, $data)) {
            $ready += eicr_job_progress($order->ID, $data)["complete"];
        }
    }
    ob_start();
    ?>
    <div id="account-overview" class="eicr-account-shell">
        <?php echo eicr_customer_notice(); ?>
        <div class="eicr-account-app">
            <?php echo eicr_customer_account_navigation($section); ?>
            <section class="eicr-app-panel">
                <?php if ($section === "overview") : ?>
                    <?php echo eicr_customer_app_heading("Customer account", "Welcome, " . ($user->display_name ?: "Customer"), "A clear summary of your bookings and available certificates."); ?>
                    <div class="eicr-dashboard-stats">
                        <a href="<?php echo esc_url(eicr_customer_account_url(["section" => "bookings"])); ?>"><span class="eicr-stat-icon"><?php echo eicr_customer_app_icon("bookings"); ?></span><div><strong><?php echo esc_html(count($orders)); ?></strong><span>Bookings</span></div></a>
                        <a href="<?php echo esc_url(eicr_customer_account_url(["section" => "certificates"])); ?>"><span class="eicr-stat-icon"><?php echo eicr_customer_app_icon("certificates"); ?></span><div><strong><?php echo esc_html($ready); ?></strong><span>Certificates ready</span></div></a>
                    </div>
                    <?php if (!$orders) : ?>
                        <section class="eicr-empty-account"><span class="eicr-empty-icon"><?php echo eicr_customer_app_icon("bookings"); ?></span><h3>No bookings yet</h3><p>Your booking activity will appear here.</p></section>
                    <?php else :
                        $latest = $orders[0];
                        $latest_data = eicr_order_data($latest->ID);
                        $latest_tracking = eicr_booking_tracking_status($latest_data);
                        ?>
                        <section class="eicr-overview-card">
                            <div><p class="eicr-account-kicker">Latest booking</p><h3><?php echo esc_html(implode(", ", eicr_order_service_names($latest_data))); ?></h3><span><?php echo esc_html($latest_data["reference"] ?? $latest->post_title); ?></span></div>
                            <div class="eicr-overview-status <?php echo $latest_tracking["is_confirmed"] ? "is-confirmed" : "is-pending"; ?>"><span>Status</span><strong><?php echo esc_html($latest_tracking["label"]); ?></strong></div>
                            <a href="<?php echo esc_url(eicr_customer_account_url(["section" => "bookings"])); ?>">View details</a>
                        </section>
                    <?php endif; ?>
                <?php elseif ($section === "bookings") : ?>
                    <?php echo eicr_customer_app_heading("Your activity", "Bookings", "Track confirmation, appointment and service details."); ?>
                    <?php if (!$orders) : ?>
                        <section class="eicr-empty-account"><span class="eicr-empty-icon"><?php echo eicr_customer_app_icon("bookings"); ?></span><h3>No bookings yet</h3><p>Your booking details will appear here.</p></section>
                    <?php else : ?>
                        <div class="eicr-booking-list">
                            <?php foreach ($orders as $order) :
                                $data = eicr_order_data($order->ID);
                                $progress = eicr_job_progress($order->ID, $data);
                                $booking_tracking = eicr_booking_tracking_status($data);
                                $payment_cleared = eicr_order_payment_cleared($order->ID, $data);
                                $customer_status = $progress["is_complete"] && !$payment_cleared ? "Completed — payment confirmation pending" : $progress["label"];
                                ?>
                                <article class="eicr-customer-booking">
                                    <div class="eicr-booking-head"><div><span class="eicr-booking-ref"><?php echo esc_html($data["reference"] ?? $order->post_title); ?></span><h3><?php echo esc_html(implode(", ", eicr_order_service_names($data))); ?></h3></div><span class="eicr-job-status eicr-job-<?php echo esc_attr($progress["is_complete"] && $payment_cleared ? "complete" : "progress"); ?>"><?php echo esc_html($customer_status); ?></span></div>
                                    <div class="eicr-booking-tracking <?php echo $booking_tracking["is_confirmed"] ? "is-confirmed" : "is-pending"; ?>"><span>Booking tracking</span><strong><?php echo esc_html($booking_tracking["label"]); ?></strong><?php if ($booking_tracking["is_confirmed"] && !empty($data["booking_confirmed_at"])) : ?><small>Confirmed <?php echo esc_html(mysql2date("j F Y, g:i a", $data["booking_confirmed_at"])); ?></small><?php endif; ?></div>
                                    <dl class="eicr-booking-facts">
                                        <div><dt>Inspection date</dt><dd><?php echo esc_html($data["date"] ?? "To be confirmed"); ?></dd></div>
                                        <div><dt>Property</dt><dd><?php echo esc_html(trim(($data["address"] ?? "") . ", " . ($data["postcode"] ?? ""), ", ")); ?></dd></div>
                                        <div><dt>Payment</dt><dd><?php echo esc_html($data["status"] ?? "Pending"); ?></dd></div>
                                        <div><dt>Certificates</dt><dd><?php echo esc_html($progress["complete"] . " of " . $progress["total"] . " ready"); ?></dd></div>
                                    </dl>
                                </article>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                <?php elseif ($section === "certificates") : ?>
                    <?php echo eicr_customer_app_heading("Your documents", "Certificates", "Download completed certificates after payment has been confirmed."); ?>
                    <?php if (!$orders) : ?>
                        <section class="eicr-empty-account"><span class="eicr-empty-icon"><?php echo eicr_customer_app_icon("certificates"); ?></span><h3>No certificates yet</h3><p>Your completed documents will appear here.</p></section>
                    <?php else : ?>
                        <div class="eicr-certificate-groups">
                            <?php foreach ($orders as $order) :
                                $data = eicr_order_data($order->ID);
                                $slots = eicr_certificate_slots($order->ID, $data);
                                $certificates = eicr_order_certificates($order->ID);
                                $payment_cleared = eicr_order_payment_cleared($order->ID, $data);
                                ?>
                                <article class="eicr-certificate-group">
                                    <header><div><span class="eicr-booking-ref"><?php echo esc_html($data["reference"] ?? $order->post_title); ?></span><h3><?php echo esc_html(implode(", ", eicr_order_service_names($data))); ?></h3></div></header>
                                    <div class="eicr-certificate-list">
                                        <?php foreach ($slots as $slot) :
                                            $certificate = $certificates[$slot["key"]] ?? [];
                                            ?>
                                            <div class="eicr-certificate-row">
                                                <span class="eicr-certificate-file-icon"><?php echo eicr_customer_app_icon("certificates"); ?></span>
                                                <div><strong><?php echo esc_html($slot["name"]); ?></strong><?php if ($certificate && $payment_cleared) : ?><span>Ready <?php echo esc_html(wp_date("j F Y", (int) ($certificate["uploaded_at"] ?? time()))); ?></span><?php elseif ($certificate) : ?><span>Available after payment confirmation.</span><?php else : ?><span>Waiting for completion.</span><?php endif; ?></div>
                                                <?php if ($certificate && $payment_cleared) : ?><a class="eicr-certificate-download" data-certificate-download data-review-service="<?php echo esc_attr($slot["name"]); ?>" href="<?php echo esc_url(eicr_certificate_download_url($order->ID, $slot["key"])); ?>">Download PDF</a><?php elseif ($certificate) : ?><span class="eicr-pending-file eicr-payment-blocked">Payment required</span><?php else : ?><span class="eicr-pending-file">Pending</span><?php endif; ?>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </article>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                <?php elseif ($section === "review") : ?>
                    <?php echo eicr_customer_app_heading("Thank you", "Share your experience", "Your feedback helps us improve our service."); ?>
                    <?php echo function_exists("eicr_account_review_form") ? eicr_account_review_form() : ""; ?>
                <?php endif; ?>
            </section>
        </div>
        <?php echo eicr_customer_download_review_prompt(); ?>
    </div>
    <?php
    return ob_get_clean();
}

function eicr_private_certificate_root()
{
    if (defined("EICR_PRIVATE_CERTIFICATE_DIR") && EICR_PRIVATE_CERTIFICATE_DIR) {
        return untrailingslashit((string) EICR_PRIVATE_CERTIFICATE_DIR);
    }
    $document_root = !empty($_SERVER["DOCUMENT_ROOT"]) ? realpath(wp_unslash($_SERVER["DOCUMENT_ROOT"])) : false;
    $default = $document_root ? untrailingslashit(dirname($document_root)) . "/eicr-private-certificates" : "";
    return untrailingslashit((string) apply_filters("eicr_private_certificate_root", $default));
}

function eicr_prepare_private_certificate_directory($order_id)
{
    $root = eicr_private_certificate_root();
    if ($root === "") {
        return new WP_Error("certificate_directory", "A private certificate directory is not configured on this server.");
    }
    $directory = $root . "/" . absint($order_id);
    if (!wp_mkdir_p($directory)) {
        return new WP_Error("certificate_directory", "The private certificate folder could not be created.");
    }
    $protect = [
        $root . "/index.php" => "<?php\n// Silence is golden.\n",
        $root . "/.htaccess" => "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n",
        $root . "/web.config" => "<?xml version=\"1.0\"?><configuration><system.webServer><security><authorization><remove users=\"*\" roles=\"\" verbs=\"\"/><add accessType=\"Deny\" users=\"*\"/></authorization></security></system.webServer></configuration>",
    ];
    foreach ($protect as $file => $contents) {
        if (!file_exists($file)) {
            @file_put_contents($file, $contents);
        }
    }
    return $directory;
}

function eicr_legacy_certificate_full_path($record)
{
    if (!is_array($record)) {
        return "";
    }
    $relative = ltrim((string) ($record["relative_path"] ?? ""), "/\\");
    if (!$relative || strpos($relative, "..") !== false) {
        return "";
    }
    $root = untrailingslashit(wp_normalize_path(WP_CONTENT_DIR . "/eicr-private-certificates"));
    $candidate = wp_normalize_path($root . "/" . $relative);
    return strpos($candidate, $root . "/") === 0 ? $candidate : "";
}

function eicr_migrate_legacy_certificate($record, $destination)
{
    $legacy = eicr_legacy_certificate_full_path($record);
    if (!$legacy || !is_file($legacy) || !$destination) {
        return false;
    }
    if (!wp_mkdir_p(dirname($destination))) {
        return false;
    }
    $moved = @rename($legacy, $destination);
    if (!$moved && @copy($legacy, $destination) && filesize($legacy) === filesize($destination)) {
        @unlink($legacy);
        $moved = true;
    }
    if ($moved) {
        @chmod($destination, 0640);
    }
    return $moved;
}

function eicr_certificate_full_path($record)
{
    if (!is_array($record)) {
        return "";
    }
    $relative = ltrim((string) ($record["relative_path"] ?? ""), "/\\");
    if (!$relative || strpos($relative, "..") !== false || eicr_private_certificate_root() === "") {
        return "";
    }
    $root = untrailingslashit(wp_normalize_path(eicr_private_certificate_root()));
    $candidate = wp_normalize_path($root . "/" . $relative);
    if (strpos($candidate, $root . "/") !== 0) {
        return "";
    }
    if (!is_file($candidate)) {
        eicr_migrate_legacy_certificate($record, $candidate);
    }
    return $candidate;
}

add_action("init", function () {
    if (get_option("eicr_certificate_storage_version") === "2" || eicr_private_certificate_root() === "") {
        return;
    }
    $pending = false;
    $order_ids = get_posts([
        "post_type" => "eicr_order",
        "post_status" => "any",
        "numberposts" => -1,
        "fields" => "ids",
        "meta_key" => "_eicr_certificates",
    ]);
    foreach ($order_ids as $order_id) {
        foreach (eicr_order_certificates($order_id) as $record) {
            $legacy = eicr_legacy_certificate_full_path($record);
            if ($legacy && is_file($legacy)) {
                eicr_certificate_full_path($record);
                if (is_file($legacy)) {
                    $pending = true;
                }
            }
        }
    }
    if (!$pending) {
        update_option("eicr_certificate_storage_version", "2", false);
    }
}, 40);

add_action("init", function () {
    if (get_option("eicr_payment_release_version") === "1") {
        return;
    }
    $order_ids = get_posts([
        "post_type" => "eicr_order",
        "post_status" => "any",
        "numberposts" => -1,
        "fields" => "ids",
        "meta_key" => "_eicr_completion_email_sent",
    ]);
    foreach ($order_ids as $order_id) {
        if (!eicr_order_payment_cleared($order_id)) {
            delete_post_meta($order_id, "_eicr_completion_email_sent");
        }
    }
    update_option("eicr_payment_release_version", "1", false);
}, 41);

add_action("add_meta_boxes_eicr_order", function () {
    add_meta_box("eicr_certificates", "Customer certificates & job completion", "eicr_certificate_admin_box", "eicr_order", "normal", "high");
}, 20);

add_action("post_edit_form_tag", function ($post) {
    if ($post instanceof WP_Post && $post->post_type === "eicr_order") {
        echo ' enctype="multipart/form-data"';
    }
});

function eicr_certificate_admin_box($post)
{
    $data = eicr_order_data($post->ID);
    $slots = eicr_certificate_slots($post->ID, $data);
    $certificates = eicr_order_certificates($post->ID);
    $progress = eicr_job_progress($post->ID, $data);
    wp_nonce_field("eicr_save_certificates_" . $post->ID, "eicr_certificate_nonce");
    echo '<div class="eicr-certificate-admin"><p><strong>Job status: ' . esc_html($progress["label"]) . '</strong> — ' . esc_html($progress["complete"] . " of " . $progress["total"]) . ' required certificate(s) uploaded.</p>';
    if (!$slots) {
        echo "<p>No selected service was recorded for this booking.</p></div>";
        return;
    }
    echo '<table class="widefat striped"><thead><tr><th>Selected service</th><th>Certificate</th><th>Action</th></tr></thead><tbody>';
    foreach ($slots as $slot) {
        $certificate = $certificates[$slot["key"]] ?? [];
        echo "<tr><td><strong>" . esc_html($slot["name"]) . "</strong></td><td>";
        if ($certificate) {
            echo '<a href="' . esc_url(eicr_certificate_download_url($post->ID, $slot["key"])) . '">' . esc_html($certificate["original_name"] ?? "Download PDF") . "</a><br><small>Uploaded " . esc_html(wp_date("j F Y, g:i a", (int) ($certificate["uploaded_at"] ?? time()))) . "</small>";
        } else {
            echo '<span class="eicr-admin-pending">Not uploaded</span>';
        }
        echo "</td><td>" . ($certificate ? '<label><input type="checkbox" name="eicr_remove_certificates[]" value="' . esc_attr($slot["key"]) . '"> Remove</label>' : "—") . "</td></tr>";
    }
    echo '</tbody></table><div class="eicr-certificate-upload"><p><label for="eicr_certificate_service"><strong>Upload or replace a PDF</strong></label><br><select id="eicr_certificate_service" name="eicr_certificate_service"><option value="">Select service</option>';
    foreach ($slots as $slot) {
        echo '<option value="' . esc_attr($slot["key"]) . '">' . esc_html($slot["name"]) . "</option>";
    }
    echo '</select> <input type="file" name="eicr_certificate_pdf" accept="application/pdf,.pdf"><p class="description">Select the matching service and upload one PDF. Maximum size: 15 MB. The customer will see only their own files.</p></div></div>';
}

function eicr_certificate_admin_notice($type, $message)
{
    set_transient("eicr_certificate_notice_" . get_current_user_id(), ["type" => $type, "message" => $message], 60);
}

add_action("admin_notices", function () {
    $notice = get_transient("eicr_certificate_notice_" . get_current_user_id());
    if (!$notice) {
        return;
    }
    delete_transient("eicr_certificate_notice_" . get_current_user_id());
    echo '<div class="notice notice-' . esc_attr($notice["type"]) . ' is-dismissible"><p>' . esc_html($notice["message"]) . "</p></div>";
});

add_action("save_post_eicr_order", "eicr_save_order_certificates", 30);
function eicr_save_order_certificates($post_id)
{
    if (defined("DOING_AUTOSAVE") && DOING_AUTOSAVE) {
        return;
    }
    if (!isset($_POST["eicr_certificate_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_certificate_nonce"])), "eicr_save_certificates_" . $post_id) || !current_user_can("edit_post", $post_id) || !current_user_can("upload_files")) {
        return;
    }
    $data = eicr_order_data($post_id);
    $slots = eicr_certificate_slots($post_id, $data);
    $allowed = [];
    foreach ($slots as $slot) {
        $allowed[$slot["key"]] = $slot["name"];
    }
    $certificates = eicr_order_certificates($post_id);
    $changed = false;
    foreach ((array) ($_POST["eicr_remove_certificates"] ?? []) as $key) {
        $key = sanitize_text_field(wp_unslash($key));
        if (!isset($allowed[$key], $certificates[$key])) {
            continue;
        }
        $old_path = eicr_certificate_full_path($certificates[$key]);
        if ($old_path && file_exists($old_path)) {
            @unlink($old_path);
        }
        unset($certificates[$key]);
        $changed = true;
    }
    $selected = sanitize_text_field(wp_unslash($_POST["eicr_certificate_service"] ?? ""));
    $file = $_FILES["eicr_certificate_pdf"] ?? null;
    if ($file && (int) ($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        if (!isset($allowed[$selected])) {
            eicr_certificate_admin_notice("error", "Select the service that matches this certificate.");
            return;
        }
        if ((int) $file["error"] !== UPLOAD_ERR_OK || (int) $file["size"] < 1 || (int) $file["size"] > 15 * MB_IN_BYTES) {
            eicr_certificate_admin_notice("error", "The PDF could not be uploaded. Check that it is no larger than 15 MB.");
            return;
        }
        $original = sanitize_file_name($file["name"]);
        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $signature = "";
        $handle = @fopen($file["tmp_name"], "rb");
        if ($handle) {
            $signature = fread($handle, 5);
            fclose($handle);
        }
        $checked = wp_check_filetype_and_ext($file["tmp_name"], $original, ["pdf" => "application/pdf"]);
        if ($extension !== "pdf" || $signature !== "%PDF-" || ($checked["ext"] ?? "") !== "pdf") {
            eicr_certificate_admin_notice("error", "Only a genuine PDF certificate can be uploaded.");
            return;
        }
        $directory = eicr_prepare_private_certificate_directory($post_id);
        if (is_wp_error($directory)) {
            eicr_certificate_admin_notice("error", $directory->get_error_message());
            return;
        }
        $filename = wp_unique_filename($directory, sanitize_title($allowed[$selected]) . "-" . wp_generate_uuid4() . ".pdf");
        $destination = trailingslashit($directory) . $filename;
        if (!@move_uploaded_file($file["tmp_name"], $destination)) {
            eicr_certificate_admin_notice("error", "The certificate file could not be saved.");
            return;
        }
        @chmod($destination, 0640);
        if (!empty($certificates[$selected])) {
            $old_path = eicr_certificate_full_path($certificates[$selected]);
            if ($old_path && file_exists($old_path) && $old_path !== $destination) {
                @unlink($old_path);
            }
        }
        $certificates[$selected] = [
            "service_name" => $allowed[$selected],
            "relative_path" => absint($post_id) . "/" . $filename,
            "original_name" => $original ?: $allowed[$selected] . ".pdf",
            "uploaded_at" => time(),
            "uploaded_by" => get_current_user_id(),
        ];
        $changed = true;
    }
    if (!$changed) {
        return;
    }
    update_post_meta($post_id, "_eicr_certificates", $certificates);
    eicr_update_job_completion($post_id, $data);
    eicr_certificate_admin_notice("success", "Certificate changes saved. The customer dashboard and job status have been updated.");
}

function eicr_update_job_completion($order_id, $data = null)
{
    $data = is_array($data) ? $data : eicr_order_data($order_id);
    $progress = eicr_job_progress($order_id, $data);
    $data["job_status"] = $progress["label"];
    if ($progress["is_complete"] && empty($data["completed_at"])) {
        $data["completed_at"] = current_time("mysql");
    }
    if (!$progress["is_complete"]) {
        unset($data["completed_at"]);
        delete_post_meta($order_id, "_eicr_completion_email_sent");
    }
    update_post_meta($order_id, "_eicr_data", $data);
    if ($progress["is_complete"] && eicr_order_payment_cleared($order_id, $data) && !get_post_meta($order_id, "_eicr_completion_email_sent", true)) {
        if (eicr_send_job_complete_email($order_id, $data)) {
            update_post_meta($order_id, "_eicr_completion_email_sent", current_time("mysql"));
        }
    }
}

function eicr_send_job_complete_email($order_id, $data)
{
    $email = sanitize_email($data["email"] ?? "");
    if (!$email) {
        return false;
    }
    $reference = $data["reference"] ?? get_the_title($order_id);
    $services = eicr_order_service_names($data);
    $account = eicr_customer_account_url();
    $business = get_option("eicr_settings", []);
    $phone = $business["phone"] ?? "+44 7878 655350";
    $body = '<div style="margin:0;background:#f3f4f6;padding:32px 12px;font-family:Arial,sans-serif;color:#111827"><div style="max-width:680px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:#121826;padding:28px 32px;color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:.15em;color:#f5b642">EICR IN LONDON</div><h1 style="margin:10px 0 0;font-size:27px">Job complete — your PDFs are ready</h1></div><div style="padding:30px 32px"><p style="font-size:16px;line-height:1.7;margin-top:0">Good news — the work for booking <strong>' . esc_html($reference) . '</strong> is now complete.</p><p style="font-size:15px;line-height:1.7">All required certificates for <strong>' . esc_html(implode(", ", $services)) . '</strong> have been uploaded securely to your customer account.</p><p style="margin:26px 0"><a href="' . esc_url($account) . '" style="display:inline-block;background:#c35a2e;color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:9px">View booking &amp; download PDFs</a></p><div style="background:#fff7ed;border-left:4px solid #c35a2e;padding:15px 17px;font-size:14px;line-height:1.65"><strong>Keep them for later.</strong><br>Your completed certificates will remain available on this website. Sign in at any time to find and download your earlier documents. If you do not yet have an account, create one using this booking email address and your records will appear automatically.</div><p style="font-size:14px;line-height:1.7;margin:24px 0 0">If you have any questions or need another property inspection, simply reply to this email or call ' . esc_html($phone) . '.</p><p style="font-size:14px;line-height:1.7">Thank you for choosing EICR in London.</p></div></div></div>';
    return wp_mail($email, "Job complete – your certificates are ready | " . $reference, $body, ["Content-Type: text/html; charset=UTF-8"]);
}

add_action("admin_post_eicr_download_certificate", "eicr_download_certificate");
function eicr_download_certificate()
{
    $order_id = absint($_GET["order_id"] ?? 0);
    $key = sanitize_text_field(wp_unslash($_GET["service_key"] ?? ""));
    if (!eicr_customer_can_access_order($order_id) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET["_wpnonce"] ?? "")), "eicr_download_certificate_" . $order_id . "_" . $key)) {
        wp_die("You are not authorised to download this certificate.", "Access denied", ["response" => 403]);
    }
    $staff_access = function_exists("eicr_is_staff_user") && eicr_is_staff_user();
    if (!current_user_can("manage_options") && !$staff_access && function_exists("eicr_is_verified_customer_user") && eicr_is_verified_customer_user() && !eicr_order_payment_cleared($order_id)) {
        wp_die("Payment confirmation is required before this certificate can be downloaded.", "Certificate not yet released", ["response" => 403]);
    }
    $certificates = eicr_order_certificates($order_id);
    $record = $certificates[$key] ?? [];
    $path = eicr_certificate_full_path($record);
    if (!$path || !is_file($path)) {
        wp_die("This certificate file is not available.", "File not found", ["response" => 404]);
    }
    if (!current_user_can("manage_options") && !$staff_access && eicr_is_verified_customer_user() && !eicr_customer_has_submitted_review()) {
        $user_id = get_current_user_id();
        update_user_meta($user_id, "_eicr_review_unlocked_at", current_time("mysql", true));
        $data = eicr_order_data($order_id);
        foreach (eicr_certificate_slots($order_id, $data) as $slot) {
            if (hash_equals((string) $slot["key"], (string) $key)) {
                update_user_meta($user_id, "_eicr_review_service", sanitize_text_field($slot["name"]));
                break;
            }
        }
    }
    $filename = sanitize_file_name($record["original_name"] ?? "certificate.pdf");
    if (strtolower(pathinfo($filename, PATHINFO_EXTENSION)) !== "pdf") {
        $filename .= ".pdf";
    }
    nocache_headers();
    header("Content-Type: application/pdf");
    header("X-Content-Type-Options: nosniff");
    header("X-Robots-Tag: noindex, nofollow, noarchive");
    header("Content-Security-Policy: sandbox; default-src 'none'");
    header('Content-Disposition: attachment; filename="' . str_replace('"', "", $filename) . '"');
    header("Content-Length: " . filesize($path));
    $handle = fopen($path, "rb");
    if ($handle) {
        fpassthru($handle);
        fclose($handle);
    }
    exit();
}

add_action("admin_enqueue_scripts", function () {
    $screen = get_current_screen();
    if (!$screen || $screen->post_type !== "eicr_order") {
        return;
    }
    wp_add_inline_style("eicr-admin-ui", ".eicr-certificate-admin>p{font-size:14px}.eicr-certificate-upload{margin-top:16px;padding:16px;border:1px solid #dcdcde;border-radius:8px;background:#f6f7f7}.eicr-certificate-upload select{min-width:280px}.eicr-admin-pending{color:#92400e;font-weight:700}");
});

function eicr_base64url_encode($value)
{
    return rtrim(strtr(base64_encode($value), "+/", "-_"), "=");
}

function eicr_base64url_decode($value)
{
    $value = strtr((string) $value, "-_", "+/");
    $padding = strlen($value) % 4;
    if ($padding) {
        $value .= str_repeat("=", 4 - $padding);
    }
    return base64_decode($value, true);
}

add_action("admin_post_nopriv_eicr_social_login", "eicr_social_login_start");
add_action("admin_post_eicr_social_login", "eicr_social_login_start");
function eicr_social_login_start()
{
    $provider = sanitize_key($_GET["provider"] ?? "");
    $redirect_to = eicr_customer_safe_booking_redirect($_GET["redirect_to"] ?? "");
    if (!in_array($provider, ["google", "apple", "facebook", "microsoft"], true) || !eicr_auth_provider_ready($provider)) {
        eicr_oauth_record_result($provider, "failed", "not_configured", "Provider credentials are incomplete.");
        eicr_account_redirect(["account_error" => "oauth_unavailable"], $redirect_to);
    }
    $state = wp_generate_password(48, false, false);
    $nonce = wp_generate_password(36, false, false);
    $browser_token = wp_generate_password(48, false, false);
    $pkce_verifier = $provider === "microsoft" ? eicr_base64url_encode(random_bytes(48)) : "";
    set_transient("eicr_oauth_" . hash("sha256", $state), [
        "provider" => $provider,
        "nonce" => $nonce,
        "browser_hash" => hash("sha256", $browser_token),
        "redirect_to" => $redirect_to,
        "pkce_verifier" => $pkce_verifier,
    ], 10 * MINUTE_IN_SECONDS);
    eicr_oauth_record_result($provider, "started", "authorization_started", "Waiting for the provider callback.");
    setcookie("eicr_oauth_browser", $browser_token, [
        "expires" => time() + 10 * MINUTE_IN_SECONDS,
        "path" => defined("COOKIEPATH") && COOKIEPATH ? COOKIEPATH : "/",
        "domain" => defined("COOKIE_DOMAIN") ? COOKIE_DOMAIN : "",
        "secure" => eicr_auth_uses_https(),
        "httponly" => true,
        "samesite" => eicr_auth_uses_https() ? "None" : "Lax",
    ]);
    $s = eicr_auth_settings();
    $redirect = eicr_auth_redirect_uri($provider);
    if ($provider === "google") {
        $url = add_query_arg([
            "client_id" => $s["google_client_id"],
            "redirect_uri" => $redirect,
            "response_type" => "code",
            "scope" => "openid email profile",
            "state" => $state,
            "nonce" => $nonce,
            "prompt" => "select_account",
        ], "https://accounts.google.com/o/oauth2/v2/auth");
    } elseif ($provider === "facebook") {
        $url = add_query_arg([
            "client_id" => $s["facebook_app_id"],
            "redirect_uri" => $redirect,
            "response_type" => "code",
            "scope" => "email,public_profile",
            "state" => $state,
        ], "https://www.facebook.com/dialog/oauth");
    } elseif ($provider === "microsoft") {
        $url = add_query_arg([
            "client_id" => $s["microsoft_client_id"],
            "redirect_uri" => $redirect,
            "response_type" => "code",
            "response_mode" => "query",
            "scope" => "openid profile email",
            "state" => $state,
            "nonce" => $nonce,
            "prompt" => "select_account",
            "code_challenge" => eicr_base64url_encode(hash("sha256", $pkce_verifier, true)),
            "code_challenge_method" => "S256",
        ], "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    } else {
        $url = add_query_arg([
            "client_id" => $s["apple_client_id"],
            "redirect_uri" => $redirect,
            "response_type" => "code",
            "response_mode" => "form_post",
            "scope" => "name email",
            "state" => $state,
            "nonce" => $nonce,
        ], "https://appleid.apple.com/auth/authorize");
    }
    wp_redirect(esc_url_raw($url));
    exit();
}

add_action("admin_post_nopriv_eicr_oauth_callback", "eicr_social_login_callback");
add_action("admin_post_eicr_oauth_callback", "eicr_social_login_callback");
function eicr_social_login_callback()
{
    $provider = sanitize_key($_REQUEST["provider"] ?? "");
    $state = sanitize_text_field(wp_unslash($_REQUEST["state"] ?? ""));
    $record = $state ? get_transient("eicr_oauth_" . hash("sha256", $state)) : false;
    $browser_token = sanitize_text_field(wp_unslash($_COOKIE["eicr_oauth_browser"] ?? ""));
    if ($state) {
        delete_transient("eicr_oauth_" . hash("sha256", $state));
    }
    setcookie("eicr_oauth_browser", "", [
        "expires" => time() - HOUR_IN_SECONDS,
        "path" => defined("COOKIEPATH") && COOKIEPATH ? COOKIEPATH : "/",
        "domain" => defined("COOKIE_DOMAIN") ? COOKIE_DOMAIN : "",
        "secure" => eicr_auth_uses_https(),
        "httponly" => true,
        "samesite" => eicr_auth_uses_https() ? "None" : "Lax",
    ]);
    $browser_matches = $browser_token && !empty($record["browser_hash"]) && hash_equals((string) $record["browser_hash"], hash("sha256", $browser_token));
    if (!empty($_REQUEST["error"])) {
        $provider_error = sanitize_key(wp_unslash($_REQUEST["error"]));
        $provider_message = sanitize_text_field(wp_unslash($_REQUEST["error_description"] ?? "The provider rejected the sign-in request."));
        eicr_oauth_record_result($provider, "failed", $provider_error ?: "provider_rejected", $provider_message);
        eicr_account_redirect(["account_error" => "oauth_failed"], $record["redirect_to"] ?? "");
    }
    if (!$record || !$browser_matches || ($record["provider"] ?? "") !== $provider) {
        eicr_oauth_record_result($provider, "failed", "state_or_cookie_mismatch", "The callback state or secure browser cookie did not match. Confirm HTTPS and cookie settings.");
        eicr_account_redirect(["account_error" => "oauth_failed"], $record["redirect_to"] ?? "");
    }
    if ($provider === "google") {
        $profile = eicr_google_profile($record);
    } elseif ($provider === "facebook") {
        $profile = eicr_facebook_profile($record);
    } elseif ($provider === "microsoft") {
        $profile = eicr_microsoft_profile($record);
    } else {
        $profile = eicr_apple_profile($record);
    }
    if (is_wp_error($profile)) {
        eicr_oauth_record_result($provider, "failed", $profile->get_error_code(), $profile->get_error_message());
        eicr_account_redirect(["account_error" => "oauth_failed"], $record["redirect_to"] ?? "");
    }
    $user = eicr_social_user($provider, $profile);
    if (is_wp_error($user)) {
        eicr_oauth_record_result($provider, "failed", $user->get_error_code(), $user->get_error_message());
        eicr_account_redirect(["account_error" => "oauth_failed"], $record["redirect_to"] ?? "");
    }
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true, eicr_auth_uses_https());
    update_user_meta($user->ID, "_eicr_email_verified", "1");
    update_user_meta($user->ID, "_eicr_email_verified_at", current_time("mysql", true));
    if (!get_user_meta($user->ID, "_eicr_terms_accepted_at", true)) {
        update_user_meta($user->ID, "_eicr_terms_accepted_at", current_time("mysql", true));
        update_user_meta($user->ID, "_eicr_terms_version", "2026-08-07");
    }
    eicr_link_orders_to_customer($user->ID);
    eicr_oauth_record_result($provider, "success", "signed_in", "Customer signed in successfully.");
    $redirect_to = eicr_customer_safe_booking_redirect($record["redirect_to"] ?? "");
    if ($redirect_to) {
        wp_safe_redirect($redirect_to);
        exit();
    }
    eicr_dashboard_redirect();
}

function eicr_google_profile($oauth)
{
    $s = eicr_auth_settings();
    $redirect = eicr_auth_redirect_uri("google");
    $response = wp_remote_post("https://oauth2.googleapis.com/token", [
        "timeout" => 20,
        "body" => [
            "code" => sanitize_text_field(wp_unslash($_GET["code"] ?? "")),
            "client_id" => $s["google_client_id"],
            "client_secret" => $s["google_client_secret"],
            "redirect_uri" => $redirect,
            "grant_type" => "authorization_code",
        ],
    ]);
    if (is_wp_error($response)) {
        return $response;
    }
    $token = json_decode(wp_remote_retrieve_body($response), true);
    if (wp_remote_retrieve_response_code($response) !== 200 || empty($token["access_token"]) || empty($token["id_token"])) {
        return new WP_Error("google_token", "Google did not return a valid identity token.");
    }
    $verification_response = wp_remote_get(add_query_arg("id_token", $token["id_token"], "https://oauth2.googleapis.com/tokeninfo"), ["timeout" => 20]);
    if (is_wp_error($verification_response)) {
        return $verification_response;
    }
    $claims = json_decode(wp_remote_retrieve_body($verification_response), true);
    $issuer = (string) ($claims["iss"] ?? "");
    $verified_email = $claims["email_verified"] ?? false;
    $nonce = (string) ($claims["nonce"] ?? "");
    if (
        wp_remote_retrieve_response_code($verification_response) !== 200 ||
        empty($claims["sub"]) ||
        empty($claims["email"]) ||
        !in_array($issuer, ["accounts.google.com", "https://accounts.google.com"], true) ||
        !hash_equals((string) $s["google_client_id"], (string) ($claims["aud"] ?? "")) ||
        (int) ($claims["exp"] ?? 0) < time() ||
        !hash_equals((string) ($oauth["nonce"] ?? ""), $nonce) ||
        !($verified_email === true || $verified_email === "true" || $verified_email === 1 || $verified_email === "1")
    ) {
        return new WP_Error("google_claims", "Google identity could not be verified.");
    }
    $profile_response = wp_remote_get("https://openidconnect.googleapis.com/v1/userinfo", [
        "timeout" => 20,
        "headers" => ["Authorization" => "Bearer " . $token["access_token"]],
    ]);
    if (is_wp_error($profile_response)) {
        return $profile_response;
    }
    $profile = json_decode(wp_remote_retrieve_body($profile_response), true);
    if (
        empty($profile["sub"]) ||
        empty($profile["email"]) ||
        empty($profile["email_verified"]) ||
        !hash_equals((string) $claims["sub"], (string) $profile["sub"]) ||
        strtolower((string) $claims["email"]) !== strtolower((string) $profile["email"])
    ) {
        return new WP_Error("google_profile", "Google email could not be verified.");
    }
    return [
        "sub" => $profile["sub"],
        "email" => $profile["email"],
        "name" => $profile["name"] ?? $profile["email"],
        "picture" => esc_url_raw($profile["picture"] ?? ""),
    ];
}

function eicr_facebook_profile($oauth)
{
    $settings = eicr_auth_settings();
    $redirect = eicr_auth_redirect_uri("facebook");
    $token_response = wp_remote_get(add_query_arg([
        "client_id" => $settings["facebook_app_id"],
        "client_secret" => $settings["facebook_app_secret"],
        "redirect_uri" => $redirect,
        "code" => sanitize_text_field(wp_unslash($_GET["code"] ?? "")),
    ], "https://graph.facebook.com/oauth/access_token"), ["timeout" => 20]);
    if (is_wp_error($token_response)) {
        return $token_response;
    }
    $token = json_decode(wp_remote_retrieve_body($token_response), true);
    if (wp_remote_retrieve_response_code($token_response) !== 200 || empty($token["access_token"])) {
        return new WP_Error("facebook_token", "Facebook did not return a valid access token.");
    }
    $debug_response = wp_remote_get(add_query_arg([
        "input_token" => $token["access_token"],
        "access_token" => $settings["facebook_app_id"] . "|" . $settings["facebook_app_secret"],
    ], "https://graph.facebook.com/debug_token"), ["timeout" => 20]);
    if (is_wp_error($debug_response)) {
        return $debug_response;
    }
    $debug = json_decode(wp_remote_retrieve_body($debug_response), true);
    $debug = is_array($debug) ? ($debug["data"] ?? []) : [];
    if (empty($debug["is_valid"]) || empty($debug["user_id"]) || !hash_equals((string) $settings["facebook_app_id"], (string) ($debug["app_id"] ?? ""))) {
        return new WP_Error("facebook_debug", "Facebook identity could not be verified.");
    }
    $profile_response = wp_remote_get(add_query_arg([
        "fields" => "id,name,email",
        "access_token" => $token["access_token"],
    ], "https://graph.facebook.com/me"), ["timeout" => 20]);
    if (is_wp_error($profile_response)) {
        return $profile_response;
    }
    $profile = json_decode(wp_remote_retrieve_body($profile_response), true);
    if (wp_remote_retrieve_response_code($profile_response) !== 200 || empty($profile["id"]) || empty($profile["email"]) || !hash_equals((string) $debug["user_id"], (string) $profile["id"]) || !is_email($profile["email"])) {
        return new WP_Error("facebook_profile", "A verified Facebook email address is required.");
    }
    return ["sub" => $profile["id"], "email" => sanitize_email($profile["email"]), "name" => sanitize_text_field($profile["name"] ?? $profile["email"])];
}

function eicr_microsoft_userinfo_endpoint()
{
    $cached = get_transient("eicr_microsoft_userinfo_endpoint");
    if (is_string($cached) && $cached !== "") {
        return $cached;
    }
    $response = wp_remote_get("https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration", ["timeout" => 20]);
    if (is_wp_error($response)) {
        return $response;
    }
    $configuration = json_decode(wp_remote_retrieve_body($response), true);
    $endpoint = esc_url_raw($configuration["userinfo_endpoint"] ?? "");
    if (wp_remote_retrieve_response_code($response) !== 200 || strtolower((string) wp_parse_url($endpoint, PHP_URL_SCHEME)) !== "https" || strtolower((string) wp_parse_url($endpoint, PHP_URL_HOST)) !== "graph.microsoft.com") {
        return new WP_Error("microsoft_configuration", "Microsoft sign-in configuration could not be verified.");
    }
    set_transient("eicr_microsoft_userinfo_endpoint", $endpoint, 12 * HOUR_IN_SECONDS);
    return $endpoint;
}

function eicr_microsoft_profile($oauth)
{
    $settings = eicr_auth_settings();
    $redirect = eicr_auth_redirect_uri("microsoft");
    $token_response = wp_remote_post("https://login.microsoftonline.com/common/oauth2/v2.0/token", [
        "timeout" => 20,
        "body" => [
            "client_id" => $settings["microsoft_client_id"],
            "client_secret" => $settings["microsoft_client_secret"],
            "code" => sanitize_text_field(wp_unslash($_GET["code"] ?? "")),
            "redirect_uri" => $redirect,
            "grant_type" => "authorization_code",
            "scope" => "openid profile email",
            "code_verifier" => (string) ($oauth["pkce_verifier"] ?? ""),
        ],
    ]);
    if (is_wp_error($token_response)) {
        return $token_response;
    }
    $token = json_decode(wp_remote_retrieve_body($token_response), true);
    if (wp_remote_retrieve_response_code($token_response) !== 200 || empty($token["access_token"])) {
        return new WP_Error("microsoft_token", "Microsoft did not return a valid access token.");
    }
    $endpoint = eicr_microsoft_userinfo_endpoint();
    if (is_wp_error($endpoint)) {
        return $endpoint;
    }
    $profile_response = wp_remote_get($endpoint, [
        "timeout" => 20,
        "headers" => ["Authorization" => "Bearer " . $token["access_token"]],
    ]);
    if (is_wp_error($profile_response)) {
        return $profile_response;
    }
    $profile = json_decode(wp_remote_retrieve_body($profile_response), true);
    if (wp_remote_retrieve_response_code($profile_response) !== 200 || empty($profile["sub"]) || empty($profile["email"]) || !is_email($profile["email"])) {
        return new WP_Error("microsoft_profile", "A verified Microsoft email address is required.");
    }
    return ["sub" => sanitize_text_field($profile["sub"]), "email" => sanitize_email($profile["email"]), "name" => sanitize_text_field($profile["name"] ?? $profile["email"])];
}

function eicr_asn1_length($length)
{
    $length = (int) $length;
    if ($length < 128) {
        return chr($length);
    }
    $bytes = "";
    while ($length > 0) {
        $bytes = chr($length & 0xff) . $bytes;
        $length >>= 8;
    }
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function eicr_asn1_value($tag, $value)
{
    return chr($tag) . eicr_asn1_length(strlen($value)) . $value;
}

function eicr_asn1_integer($value)
{
    $value = ltrim((string) $value, "\x00");
    if ($value === "") {
        $value = "\x00";
    }
    if (ord($value[0]) & 0x80) {
        $value = "\x00" . $value;
    }
    return eicr_asn1_value(0x02, $value);
}

function eicr_apple_public_key_pem($jwk)
{
    $modulus = eicr_base64url_decode($jwk["n"] ?? "");
    $exponent = eicr_base64url_decode($jwk["e"] ?? "");
    if ($modulus === false || $exponent === false || $modulus === "" || $exponent === "") {
        return "";
    }
    $rsa_key = eicr_asn1_value(0x30, eicr_asn1_integer($modulus) . eicr_asn1_integer($exponent));
    $algorithm = hex2bin("300d06092a864886f70d0101010500");
    $subject_key = eicr_asn1_value(0x03, "\x00" . $rsa_key);
    $der = eicr_asn1_value(0x30, $algorithm . $subject_key);
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function eicr_apple_jwks($force_refresh = false)
{
    $cache_key = "eicr_apple_jwks";
    if (!$force_refresh) {
        $cached = get_transient($cache_key);
        if (is_array($cached) && !empty($cached["keys"])) {
            return $cached;
        }
    }
    $response = wp_remote_get("https://appleid.apple.com/auth/keys", ["timeout" => 20]);
    if (is_wp_error($response)) {
        return $response;
    }
    $jwks = json_decode(wp_remote_retrieve_body($response), true);
    if (wp_remote_retrieve_response_code($response) !== 200 || !is_array($jwks) || empty($jwks["keys"])) {
        return new WP_Error("apple_keys", "Apple verification keys could not be loaded.");
    }
    set_transient($cache_key, $jwks, 12 * HOUR_IN_SECONDS);
    return $jwks;
}

function eicr_apple_verified_claims($id_token)
{
    if (!function_exists("openssl_verify")) {
        return new WP_Error("apple_openssl", "OpenSSL is required for Apple identity verification.");
    }
    $parts = explode(".", (string) $id_token);
    if (count($parts) !== 3) {
        return new WP_Error("apple_token", "Apple returned an invalid identity token.");
    }
    $header_raw = eicr_base64url_decode($parts[0]);
    $claims_raw = eicr_base64url_decode($parts[1]);
    $signature = eicr_base64url_decode($parts[2]);
    $header = $header_raw !== false ? json_decode($header_raw, true) : null;
    $claims = $claims_raw !== false ? json_decode($claims_raw, true) : null;
    if (!is_array($header) || !is_array($claims) || $signature === false || ($header["alg"] ?? "") !== "RS256" || empty($header["kid"])) {
        return new WP_Error("apple_token", "Apple returned an invalid identity token.");
    }
    for ($attempt = 0; $attempt < 2; $attempt++) {
        $jwks = eicr_apple_jwks($attempt === 1);
        if (is_wp_error($jwks)) {
            return $jwks;
        }
        foreach ((array) $jwks["keys"] as $jwk) {
            if (($jwk["kid"] ?? "") !== $header["kid"] || ($jwk["kty"] ?? "") !== "RSA") {
                continue;
            }
            $pem = eicr_apple_public_key_pem($jwk);
            if ($pem && openssl_verify($parts[0] . "." . $parts[1], $signature, $pem, OPENSSL_ALGO_SHA256) === 1) {
                return $claims;
            }
        }
    }
    return new WP_Error("apple_signature", "Apple identity signature could not be verified.");
}

function eicr_apple_client_secret()
{
    $s = eicr_auth_settings();
    $now = time();
    $header = eicr_base64url_encode(wp_json_encode(["alg" => "ES256", "kid" => $s["apple_key_id"]]));
    $payload = eicr_base64url_encode(wp_json_encode(["iss" => $s["apple_team_id"], "iat" => $now, "exp" => $now + 300, "aud" => "https://appleid.apple.com", "sub" => $s["apple_client_id"]]));
    $key = openssl_pkey_get_private($s["apple_private_key"]);
    if (!$key || !openssl_sign($header . "." . $payload, $der, $key, OPENSSL_ALGO_SHA256)) {
        return new WP_Error("apple_key", "Apple private key could not sign the request.");
    }
    $signature = eicr_der_to_jose($der, 32);
    if (!$signature) {
        return new WP_Error("apple_signature", "Apple request signature could not be created.");
    }
    return $header . "." . $payload . "." . eicr_base64url_encode($signature);
}

function eicr_der_to_jose($der, $part_length)
{
    $position = 0;
    if (ord($der[$position++]) !== 0x30) {
        return false;
    }
    $length = ord($der[$position++]);
    if ($length & 0x80) {
        $bytes = $length & 0x7f;
        $position += $bytes;
    }
    if (ord($der[$position++]) !== 0x02) {
        return false;
    }
    $r_length = ord($der[$position++]);
    $r = substr($der, $position, $r_length);
    $position += $r_length;
    if (ord($der[$position++]) !== 0x02) {
        return false;
    }
    $s_length = ord($der[$position++]);
    $s = substr($der, $position, $s_length);
    $r = str_pad(ltrim($r, "\x00"), $part_length, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), $part_length, "\x00", STR_PAD_LEFT);
    return substr($r, -$part_length) . substr($s, -$part_length);
}

function eicr_apple_profile($oauth)
{
    $s = eicr_auth_settings();
    $secret = eicr_apple_client_secret();
    if (is_wp_error($secret)) {
        return $secret;
    }
    $redirect = eicr_auth_redirect_uri("apple");
    $response = wp_remote_post("https://appleid.apple.com/auth/token", [
        "timeout" => 20,
        "body" => [
            "client_id" => $s["apple_client_id"],
            "client_secret" => $secret,
            "code" => sanitize_text_field(wp_unslash($_POST["code"] ?? $_GET["code"] ?? "")),
            "grant_type" => "authorization_code",
            "redirect_uri" => $redirect,
        ],
    ]);
    if (is_wp_error($response)) {
        return $response;
    }
    $token = json_decode(wp_remote_retrieve_body($response), true);
    if (wp_remote_retrieve_response_code($response) !== 200 || empty($token["id_token"])) {
        return new WP_Error("apple_token", "Apple did not return a valid identity token.");
    }
    $claims = eicr_apple_verified_claims($token["id_token"]);
    if (is_wp_error($claims)) {
        return $claims;
    }
    $nonce_claim = (string) ($claims["nonce"] ?? "");
    $nonce_matches = $nonce_claim && (hash_equals((string) $oauth["nonce"], $nonce_claim) || hash_equals(hash("sha256", (string) $oauth["nonce"]), $nonce_claim));
    $audience = (array) ($claims["aud"] ?? []);
    $email_verified = $claims["email_verified"] ?? false;
    if (
        empty($claims["sub"]) ||
        empty($claims["email"]) ||
        ($claims["iss"] ?? "") !== "https://appleid.apple.com" ||
        !in_array($s["apple_client_id"], $audience, true) ||
        (int) ($claims["exp"] ?? 0) < time() ||
        (int) ($claims["iat"] ?? 0) > time() + 300 ||
        !$nonce_matches ||
        !($email_verified === true || $email_verified === "true" || $email_verified === 1 || $email_verified === "1")
    ) {
        return new WP_Error("apple_claims", "Apple identity could not be verified.");
    }
    $name = "Apple customer";
    if (!empty($_POST["user"])) {
        $apple_user = json_decode(wp_unslash($_POST["user"]), true);
        $name = trim(($apple_user["name"]["firstName"] ?? "") . " " . ($apple_user["name"]["lastName"] ?? "")) ?: $name;
    }
    return ["sub" => $claims["sub"], "email" => sanitize_email($claims["email"] ?? ""), "name" => $name];
}

function eicr_social_user($provider, $profile)
{
    $users = get_users(["number" => 1, "meta_key" => "_eicr_" . $provider . "_sub", "meta_value" => $profile["sub"]]);
    if ($users) {
        if (!eicr_is_customer_user($users[0])) {
            return new WP_Error(
                "social_role",
                "This social identity is attached to a non-customer WordPress account.",
            );
        }
        $user = $users[0];
    } else {
        $email = sanitize_email($profile["email"] ?? "");
        if (!$email) {
            return new WP_Error("social_email", "A verified email address is required.");
        }
        $user = get_user_by("email", $email);
        if ($user && !eicr_is_customer_user($user)) {
            return new WP_Error(
                "social_role",
                "This email belongs to a non-customer WordPress account and cannot be linked automatically.",
            );
        }
        if (!$user) {
            $base = sanitize_user(strstr($email, "@", true), true) ?: $provider . "-customer";
            $login = $base;
            $i = 1;
            while (username_exists($login)) {
                $login = $base . $i++;
            }
            $user_id = wp_insert_user([
                "user_login" => $login,
                "user_email" => $email,
                "user_pass" => wp_generate_password(32, true, true),
                "display_name" => sanitize_text_field($profile["name"] ?? $email),
                "role" => "eicr_customer",
            ]);
            if (is_wp_error($user_id)) {
                return $user_id;
            }
            $user = get_user_by("id", $user_id);
        }
    }
    update_user_meta($user->ID, "_eicr_" . $provider . "_sub", sanitize_text_field($profile["sub"]));
    update_user_meta($user->ID, "_eicr_email_verified", "1");
    update_user_meta($user->ID, "_eicr_email_verified_at", current_time("mysql", true));
    if ($provider === "google" && !empty($profile["picture"])) {
        eicr_customer_import_google_avatar($user->ID, $profile["picture"]);
    }
    return $user;
}

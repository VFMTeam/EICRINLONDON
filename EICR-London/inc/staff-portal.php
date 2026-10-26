<?php
if (!defined("ABSPATH")) {
    exit();
}

define("EICR_STAFF_PORTAL_VERSION", "1.1.0");

function eicr_has_staff_role($user = null)
{
    $user = $user ?: wp_get_current_user();
    return $user && $user->exists() && in_array("eicr_staff", (array) $user->roles, true);
}

function eicr_is_staff_user($user = null)
{
    $user = $user ?: wp_get_current_user();
    return eicr_has_staff_role($user) && get_user_meta($user->ID, "_eicr_staff_active", true) !== "0";
}

function eicr_staff_portal_access()
{
    return current_user_can("manage_options") || (eicr_is_staff_user() && eicr_staff_browser_is_trusted());
}

function eicr_staff_login_url($args = [])
{
    return eicr_customer_page_url("staff-login", $args);
}

function eicr_staff_dashboard_url($args = [])
{
    return eicr_customer_page_url("staff-dashboard", $args);
}

function eicr_staff_verification_url($args = [])
{
    return eicr_customer_page_url("staff-verify", $args);
}

function eicr_staff_cookie_name($type = "device")
{
    return "eicr_staff_" . sanitize_key($type) . "_" . substr(md5(home_url("/")), 0, 10);
}

function eicr_staff_set_private_cookie($name, $value, $expires)
{
    $options = [
        "expires" => (int) $expires,
        "path" => defined("COOKIEPATH") && COOKIEPATH ? COOKIEPATH : "/",
        "domain" => defined("COOKIE_DOMAIN") && COOKIE_DOMAIN ? COOKIE_DOMAIN : "",
        "secure" => is_ssl(),
        "httponly" => true,
        "samesite" => "Lax",
    ];
    setcookie($name, $value, $options);
    if ($expires > time()) {
        $_COOKIE[$name] = $value;
    } else {
        unset($_COOKIE[$name]);
    }
}

function eicr_staff_clear_private_cookie($type)
{
    eicr_staff_set_private_cookie(eicr_staff_cookie_name($type), "", time() - HOUR_IN_SECONDS);
}

function eicr_staff_device_hash($validator)
{
    return hash_hmac("sha256", (string) $validator, wp_salt("auth"));
}

function eicr_staff_trusted_browsers($user_id)
{
    $records = get_user_meta(absint($user_id), "_eicr_staff_trusted_browsers", true);
    $records = is_array($records) ? $records : [];
    $now = time();
    foreach ($records as $selector => $record) {
        if (!is_array($record) || empty($record["hash"]) || (int) ($record["expires"] ?? 0) < $now) {
            unset($records[$selector]);
        }
    }
    return $records;
}

function eicr_staff_browser_is_trusted($user = null)
{
    $user = $user ?: wp_get_current_user();
    if (!$user instanceof WP_User || !$user->exists() || !eicr_is_staff_user($user)) {
        return false;
    }
    $cookie = sanitize_text_field(wp_unslash($_COOKIE[eicr_staff_cookie_name("device")] ?? ""));
    $parts = explode(".", $cookie);
    if (count($parts) !== 3 || (int) $parts[0] !== (int) $user->ID || !ctype_xdigit($parts[1]) || !ctype_xdigit($parts[2])) {
        return false;
    }
    $records = eicr_staff_trusted_browsers($user->ID);
    $record = $records[$parts[1]] ?? [];
    return !empty($record["hash"]) && hash_equals((string) $record["hash"], eicr_staff_device_hash($parts[2]));
}

function eicr_staff_register_trusted_browser($user_id)
{
    $user_id = absint($user_id);
    $records = eicr_staff_trusted_browsers($user_id);
    uasort($records, function ($a, $b) {
        return (int) ($b["verified_at"] ?? 0) <=> (int) ($a["verified_at"] ?? 0);
    });
    $records = array_slice($records, 0, 4, true);
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $expires = time() + 90 * DAY_IN_SECONDS;
    $records[$selector] = [
        "hash" => eicr_staff_device_hash($validator),
        "verified_at" => time(),
        "expires" => $expires,
        "browser" => substr(sanitize_text_field(wp_unslash($_SERVER["HTTP_USER_AGENT"] ?? "Unknown browser")), 0, 180),
    ];
    update_user_meta($user_id, "_eicr_staff_trusted_browsers", $records);
    eicr_staff_set_private_cookie(eicr_staff_cookie_name("device"), $user_id . "." . $selector . "." . $validator, $expires);
}

function eicr_staff_revoke_trusted_browsers($user_id)
{
    delete_user_meta(absint($user_id), "_eicr_staff_trusted_browsers");
    if ((int) get_current_user_id() === (int) $user_id) {
        eicr_staff_clear_private_cookie("device");
    }
}

function eicr_staff_admin_verification_email()
{
    return sanitize_email((string) get_option("admin_email"));
}

function eicr_staff_issue_verification_challenge($user)
{
    $admin_email = eicr_staff_admin_verification_email();
    if (!$user instanceof WP_User || !eicr_is_staff_user($user) || !is_email($admin_email)) {
        return new WP_Error("verification_failed", "The WordPress Administration Email is unavailable.");
    }
    $challenge = bin2hex(random_bytes(24));
    $code = (string) random_int(100000, 999999);
    $expires = time() + 10 * MINUTE_IN_SECONDS;
    set_transient("eicr_staff_challenge_" . hash("sha256", $challenge), [
        "user_id" => (int) $user->ID,
        "code_hash" => hash_hmac("sha256", $code, wp_salt("nonce")),
        "expires" => $expires,
        "attempts" => 0,
    ], 10 * MINUTE_IN_SECONDS);
    eicr_staff_set_private_cookie(eicr_staff_cookie_name("challenge"), $challenge, $expires);
    $site_name = wp_specialchars_decode(get_bloginfo("name"), ENT_QUOTES);
    $message = "A staff account is signing in from a new browser.\n\n";
    $message .= "Verification code: " . $code . "\n";
    $message .= "Staff account: " . $user->user_email . "\n";
    $message .= "Website: " . home_url("/") . "\n";
    $message .= "Browser: " . substr(sanitize_text_field(wp_unslash($_SERVER["HTTP_USER_AGENT"] ?? "Unknown")), 0, 180) . "\n\n";
    $message .= "The code expires in 10 minutes. Share it only if you recognise this staff sign-in.";
    if (!wp_mail($admin_email, $site_name . " staff browser verification code", $message, ["Content-Type: text/plain; charset=UTF-8"])) {
        delete_transient("eicr_staff_challenge_" . hash("sha256", $challenge));
        eicr_staff_clear_private_cookie("challenge");
        return new WP_Error("verification_failed", "The verification email could not be sent.");
    }
    return $challenge;
}

function eicr_staff_begin_login($user)
{
    if (!$user instanceof WP_User || !eicr_has_staff_role($user)) {
        return new WP_Error("no_account", "No staff account found.");
    }
    if (!eicr_is_staff_user($user)) {
        return new WP_Error("inactive", "The staff account is inactive.");
    }
    wp_clear_auth_cookie();
    wp_set_current_user(0);
    if (eicr_staff_browser_is_trusted($user)) {
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID, false, is_ssl());
        wp_safe_redirect(eicr_staff_dashboard_url());
        exit();
    }
    $challenge = eicr_staff_issue_verification_challenge($user);
    if (is_wp_error($challenge)) {
        return $challenge;
    }
    wp_safe_redirect(eicr_staff_verification_url(["challenge" => $challenge]));
    exit();
}

function eicr_staff_portal_install()
{
    add_role("eicr_staff", "EICR Operations Staff", ["read" => true]);
    $pages = [
        "staff-login" => ["Staff Login", "[eicr_staff_login]"],
        "staff-verify" => ["Verify Staff Browser", "[eicr_staff_verify]"],
        "staff-dashboard" => ["Staff Dashboard", "[eicr_staff_dashboard]"],
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
    update_option("eicr_staff_portal_version", EICR_STAFF_PORTAL_VERSION);
}
add_action("after_switch_theme", "eicr_staff_portal_install", 30);
add_action("init", function () {
    if (get_option("eicr_staff_portal_version") !== EICR_STAFF_PORTAL_VERSION) {
        eicr_staff_portal_install();
    }
}, 30);

add_action("admin_init", function () {
    global $pagenow;
    if (!eicr_has_staff_role() || wp_doing_ajax() || $pagenow === "admin-post.php") {
        return;
    }
    if (!eicr_is_staff_user()) {
        wp_clear_auth_cookie();
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "inactive"]));
        exit();
    }
    if (!eicr_staff_browser_is_trusted()) {
        wp_clear_auth_cookie();
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "verification_required"]));
        exit();
    }
    wp_safe_redirect(eicr_staff_dashboard_url());
    exit();
}, 2);

add_filter("login_redirect", function ($redirect_to, $requested, $user) {
    return $user instanceof WP_User && eicr_is_staff_user($user) && eicr_staff_browser_is_trusted($user)
        ? eicr_staff_dashboard_url()
        : $redirect_to;
}, 20, 3);

add_action("template_redirect", function () {
    if (eicr_has_staff_role()) {
        if (!eicr_is_staff_user()) {
            wp_clear_auth_cookie();
            wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "inactive"]));
            exit();
        }
        if (!eicr_staff_browser_is_trusted()) {
            wp_clear_auth_cookie();
            wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "verification_required"]));
            exit();
        }
        if (is_page("staff-dashboard")) {
            return;
        }
        wp_safe_redirect(eicr_staff_dashboard_url());
        exit();
    }
    if (is_page("staff-dashboard") && !current_user_can("manage_options")) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "login_required"]));
        exit();
    }
}, 1);

add_action("wp_enqueue_scripts", function () {
    if (is_page(["staff-login", "staff-verify", "staff-dashboard"])) {
        wp_enqueue_style(
            "eicr-staff-portal",
            EICR_THEME_URI . "/assets/css/staff-portal.css",
            ["eicr-theme"],
            filemtime(EICR_THEME_DIR . "/assets/css/staff-portal.css"),
        );
    }
});

function eicr_staff_notice_html()
{
    $key = sanitize_key($_GET["staff_notice"] ?? "");
    $messages = [
        "login_required" => ["info", "Please sign in with your staff account."],
        "invalid_login" => ["error", "The staff sign-in could not be completed."],
        "no_account" => ["error", "No staff account found for this email address."],
        "wrong_password" => ["error", "Wrong password. Please try again."],
        "inactive" => ["error", "This staff account is inactive. Ask the website owner for access."],
        "verification_required" => ["info", "This browser must be approved by the website owner before staff access can continue."],
        "verification_failed" => ["error", "The verification code could not be emailed. Ask the website owner to check the WordPress Administration Email and SMTP settings."],
        "invalid_code" => ["error", "That verification code was incorrect."],
        "expired_code" => ["error", "That verification request has expired. Sign in again to receive a new code."],
        "too_many" => ["error", "Too many login attempts. Please wait 15 minutes and try again."],
        "certificate_saved" => ["success", "Certificate uploaded. Job progress and the customer account were updated."],
        "certificate_error" => ["error", "The certificate could not be saved. Use a genuine PDF no larger than 15 MB."],
        "booking_saved" => ["success", "Operational booking details updated."],
        "booking_confirmed" => ["success", "Booking confirmed. The customer tracking status now shows Booking Confirmed."],
        "quote_saved" => ["success", "Quote status updated."],
        "review_saved" => ["success", "Review status updated."],
        "action_error" => ["error", "That action could not be completed."],
    ];
    if (!isset($messages[$key])) {
        return "";
    }
    return '<div class="eicr-staff-notice eicr-staff-' . esc_attr($messages[$key][0]) . '" role="status">' . esc_html($messages[$key][1]) . '</div>';
}

function eicr_staff_login_shortcode()
{
    if (eicr_staff_portal_access()) {
        return '<div class="eicr-staff-login-card"><h2>Staff access is active</h2><p>Open the operations workspace to manage customer work.</p><a class="eicr-staff-primary" href="' . esc_url(eicr_staff_dashboard_url()) . '">Open Staff Dashboard</a></div>';
    }
    ob_start();
    ?>
    <div class="eicr-staff-login-wrap">
        <section class="eicr-staff-login-intro"><p>Private operations access</p><h2>Staff workspace</h2><span>Bookings, customer details, quotes, reviews and certificate delivery. Payment values and owner settings are not available here.</span></section>
        <section class="eicr-staff-login-card">
            <?php echo eicr_staff_notice_html(); ?>
            <h2>Staff sign in</h2>
            <p>Use the work account created by the website owner.</p>
            <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-staff-form">
                <input type="hidden" name="action" value="eicr_staff_login">
                <?php wp_nonce_field("eicr_staff_login", "eicr_staff_nonce"); ?>
                <label>Email address<input type="email" name="email" autocomplete="username" required></label>
                <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
                <button type="submit">Sign in to Staff Dashboard</button>
            </form>
        </section>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode("eicr_staff_login", "eicr_staff_login_shortcode");

add_action("admin_post_nopriv_eicr_staff_login", "eicr_staff_login_submit");
add_action("admin_post_eicr_staff_login", "eicr_staff_login_submit");
function eicr_staff_login_submit()
{
    if (!isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_login")) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "invalid_login"]));
        exit();
    }
    if (!eicr_customer_rate_limit("staff_login", 12, 15 * MINUTE_IN_SECONDS)) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "too_many"]));
        exit();
    }
    $email = sanitize_email(wp_unslash($_POST["email"] ?? ""));
    $candidate = $email ? get_user_by("email", $email) : false;
    if (!$candidate || !eicr_has_staff_role($candidate)) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "no_account"]));
        exit();
    }
    if (!wp_check_password((string) wp_unslash($_POST["password"] ?? ""), $candidate->user_pass, $candidate->ID)) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "wrong_password"]));
        exit();
    }
    if (!eicr_is_staff_user($candidate)) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "inactive"]));
        exit();
    }
    $result = eicr_staff_begin_login($candidate);
    wp_safe_redirect(eicr_staff_login_url(["staff_notice" => is_wp_error($result) ? $result->get_error_code() : "verification_failed"]));
    exit();
}

function eicr_staff_verify_shortcode()
{
    if (eicr_staff_portal_access()) {
        return '<div class="eicr-staff-login-card"><h2>Browser approved</h2><p>This browser can open the staff workspace.</p><a class="eicr-staff-primary" href="' . esc_url(eicr_staff_dashboard_url()) . '">Open Staff Dashboard</a></div>';
    }
    $challenge = sanitize_text_field(wp_unslash($_GET["challenge"] ?? ""));
    $cookie = sanitize_text_field(wp_unslash($_COOKIE[eicr_staff_cookie_name("challenge")] ?? ""));
    $record = $challenge && ctype_xdigit($challenge) && hash_equals($challenge, $cookie)
        ? get_transient("eicr_staff_challenge_" . hash("sha256", $challenge))
        : false;
    ob_start();
    ?>
    <div class="eicr-staff-login-wrap eicr-staff-verify-wrap">
        <section class="eicr-staff-login-intro"><p>New browser check</p><h2>Owner approval required</h2><span>A six-digit code has been sent to the WordPress Administration Email. Staff cannot view or change that email address.</span></section>
        <section class="eicr-staff-login-card">
            <?php echo eicr_staff_notice_html(); ?>
            <?php if (!is_array($record) || (int) ($record["expires"] ?? 0) < time()) : ?>
                <div class="eicr-staff-notice eicr-staff-error" role="alert">This verification request is invalid or expired.</div>
                <a class="eicr-staff-primary" href="<?php echo esc_url(eicr_staff_login_url()); ?>">Return to Staff Login</a>
            <?php else : ?>
                <h2>Enter verification code</h2>
                <p>Ask the website owner for the code sent to the administration email. It expires after 10 minutes.</p>
                <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-staff-form">
                    <input type="hidden" name="action" value="eicr_staff_verify">
                    <input type="hidden" name="challenge" value="<?php echo esc_attr($challenge); ?>">
                    <?php wp_nonce_field("eicr_staff_verify", "eicr_staff_nonce"); ?>
                    <label>Six-digit code<input class="eicr-staff-code" type="text" name="verification_code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label>
                    <button type="submit">Verify this browser</button>
                </form>
                <a class="eicr-staff-cancel" href="<?php echo esc_url(eicr_staff_login_url()); ?>">Cancel and sign in again</a>
            <?php endif; ?>
        </section>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode("eicr_staff_verify", "eicr_staff_verify_shortcode");

add_action("admin_post_nopriv_eicr_staff_verify", "eicr_staff_verify_submit");
add_action("admin_post_eicr_staff_verify", "eicr_staff_verify_submit");
function eicr_staff_verify_submit()
{
    if (!isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_verify")) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "expired_code"]));
        exit();
    }
    if (!eicr_customer_rate_limit("staff_verify", 10, 15 * MINUTE_IN_SECONDS)) {
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "too_many"]));
        exit();
    }
    $challenge = sanitize_text_field(wp_unslash($_POST["challenge"] ?? ""));
    $cookie = sanitize_text_field(wp_unslash($_COOKIE[eicr_staff_cookie_name("challenge")] ?? ""));
    $key = "eicr_staff_challenge_" . hash("sha256", $challenge);
    $record = $challenge && ctype_xdigit($challenge) && hash_equals($challenge, $cookie) ? get_transient($key) : false;
    if (!is_array($record) || (int) ($record["expires"] ?? 0) < time()) {
        delete_transient($key);
        eicr_staff_clear_private_cookie("challenge");
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "expired_code"]));
        exit();
    }
    $record["attempts"] = (int) ($record["attempts"] ?? 0) + 1;
    $code = preg_replace('/\D+/', '', (string) wp_unslash($_POST["verification_code"] ?? ""));
    $valid = strlen($code) === 6 && hash_equals((string) $record["code_hash"], hash_hmac("sha256", $code, wp_salt("nonce")));
    if (!$valid) {
        if ($record["attempts"] >= 5) {
            delete_transient($key);
            eicr_staff_clear_private_cookie("challenge");
            wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "too_many"]));
            exit();
        }
        set_transient($key, $record, max(MINUTE_IN_SECONDS, (int) $record["expires"] - time()));
        wp_safe_redirect(eicr_staff_verification_url(["challenge" => $challenge, "staff_notice" => "invalid_code"]));
        exit();
    }
    $user = get_user_by("id", absint($record["user_id"] ?? 0));
    if (!$user || !eicr_is_staff_user($user)) {
        delete_transient($key);
        eicr_staff_clear_private_cookie("challenge");
        wp_safe_redirect(eicr_staff_login_url(["staff_notice" => "inactive"]));
        exit();
    }
    delete_transient($key);
    eicr_staff_clear_private_cookie("challenge");
    eicr_staff_register_trusted_browser($user->ID);
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, false, is_ssl());
    wp_safe_redirect(eicr_staff_dashboard_url());
    exit();
}

function eicr_staff_dashboard_shortcode()
{
    if (!eicr_staff_portal_access()) {
        return '<div class="eicr-staff-login-card"><h2>Staff sign-in required</h2><a class="eicr-staff-primary" href="' . esc_url(eicr_staff_login_url()) . '">Staff Login</a></div>';
    }
    $tab = sanitize_key($_GET["staff_tab"] ?? "bookings");
    if (!in_array($tab, ["bookings", "quotes", "reviews"], true)) {
        $tab = "bookings";
    }
    $counts = [
        "bookings" => (int) (wp_count_posts("eicr_order")->publish ?? 0),
        "quotes" => (int) (wp_count_posts("eicr_quote")->publish ?? 0),
        "reviews" => (int) (wp_count_posts("eicr_review")->pending ?? 0),
    ];
    $user = wp_get_current_user();
    ob_start();
    ?>
    <div class="eicr-staff-shell">
        <?php echo eicr_staff_notice_html(); ?>
        <header class="eicr-staff-header">
            <div><p>Operations workspace</p><h2>Welcome, <?php echo esc_html($user->display_name ?: $user->user_email); ?></h2><span>Customer work only. Payment amounts and owner settings are intentionally hidden.</span></div>
            <a href="<?php echo esc_url(wp_logout_url(eicr_staff_login_url())); ?>">Sign out</a>
        </header>
        <nav class="eicr-staff-tabs" aria-label="Staff workspace">
            <?php foreach (["bookings" => "Bookings", "quotes" => "Quotes", "reviews" => "Pending reviews"] as $key => $label) : ?>
                <a class="<?php echo $tab === $key ? "is-active" : ""; ?>" href="<?php echo esc_url(eicr_staff_dashboard_url(["staff_tab" => $key])); ?>"><?php echo esc_html($label); ?><strong><?php echo esc_html($counts[$key]); ?></strong></a>
            <?php endforeach; ?>
        </nav>
        <?php
        if ($tab === "bookings") {
            echo eicr_staff_bookings_html();
        } elseif ($tab === "quotes") {
            echo eicr_staff_quotes_html();
        } else {
            echo eicr_staff_reviews_html();
        }
        ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode("eicr_staff_dashboard", "eicr_staff_dashboard_shortcode");

function eicr_staff_bookings_html()
{
    $order_id = absint($_GET["order_id"] ?? 0);
    if ($order_id && get_post_type($order_id) === "eicr_order") {
        return eicr_staff_booking_detail_html($order_id);
    }
    $orders = get_posts([
        "post_type" => "eicr_order",
        "post_status" => "publish",
        "numberposts" => -1,
        "orderby" => "date",
        "order" => "DESC",
    ]);
    ob_start();
    ?>
    <section class="eicr-staff-panel"><div class="eicr-staff-panel-title"><h3>Bookings</h3><span>Newest booking first</span></div>
    <?php if (!$orders) : ?><p class="eicr-staff-empty">No bookings have been received.</p><?php else : ?>
    <div class="eicr-staff-table-wrap"><table class="eicr-staff-table"><thead><tr><th>Work</th><th>Customer</th><th>Property</th><th>Appointment</th><th>Booking status</th><th>Job progress</th><th></th></tr></thead><tbody>
    <?php foreach ($orders as $order) : $data = eicr_order_data($order->ID); $progress = eicr_job_progress($order->ID, $data); $booking_tracking = eicr_booking_tracking_status($data); ?>
        <tr>
            <td><strong><?php echo esc_html($data["reference"] ?? $order->post_title); ?></strong><span><?php echo esc_html(implode(", ", eicr_order_service_names($data))); ?></span></td>
            <td><?php echo esc_html($data["name"] ?? "—"); ?><span><?php echo esc_html($data["phone"] ?? ""); ?></span></td>
            <td><?php echo esc_html(trim(($data["address"] ?? "") . ", " . ($data["postcode"] ?? ""), ", ")); ?></td>
            <td><?php echo esc_html(trim(($data["date"] ?? "To be confirmed") . " " . ($data["time_slot"] ?? ""))); ?></td>
            <td><span class="eicr-staff-status <?php echo $booking_tracking["is_confirmed"] ? "is-complete" : ""; ?>"><?php echo esc_html($booking_tracking["label"]); ?></span></td>
            <td><span class="eicr-staff-status <?php echo $progress["is_complete"] ? "is-complete" : ""; ?>"><?php echo esc_html($progress["label"]); ?></span></td>
            <td><a class="eicr-staff-open" href="<?php echo esc_url(eicr_staff_dashboard_url(["staff_tab" => "bookings", "order_id" => $order->ID])); ?>">Open</a></td>
        </tr>
    <?php endforeach; ?>
    </tbody></table></div><?php endif; ?></section>
    <?php
    return ob_get_clean();
}

function eicr_staff_booking_detail_html($order_id)
{
    $data = eicr_order_data($order_id);
    $slots = eicr_certificate_slots($order_id, $data);
    $certificates = eicr_order_certificates($order_id);
    $progress = eicr_job_progress($order_id, $data);
    $booking_tracking = eicr_booking_tracking_status($data);
    $customer_release = function_exists("eicr_order_payment_cleared") && eicr_order_payment_cleared($order_id, $data);
    ob_start();
    ?>
    <a class="eicr-staff-back" href="<?php echo esc_url(eicr_staff_dashboard_url(["staff_tab" => "bookings"])); ?>">← Back to bookings</a>
    <section class="eicr-staff-panel">
        <div class="eicr-staff-panel-title"><div><h3><?php echo esc_html($data["reference"] ?? get_the_title($order_id)); ?></h3><span><?php echo esc_html(implode(", ", eicr_order_service_names($data))); ?> · Customer release: <?php echo $customer_release ? "Cleared" : "Blocked pending payment confirmation"; ?></span></div><div class="eicr-staff-status-group"><span class="eicr-staff-status <?php echo $booking_tracking["is_confirmed"] ? "is-complete" : ""; ?>"><?php echo esc_html($booking_tracking["label"]); ?></span><span class="eicr-staff-status <?php echo $progress["is_complete"] ? "is-complete" : ""; ?>"><?php echo esc_html($progress["label"] . " · " . $progress["complete"] . "/" . $progress["total"] . " PDFs"); ?></span></div></div>
        <div class="eicr-staff-detail-grid">
            <article><h4>Customer</h4><dl><div><dt>Name</dt><dd><?php echo esc_html($data["name"] ?? "—"); ?></dd></div><div><dt>Email</dt><dd><a href="mailto:<?php echo esc_attr($data["email"] ?? ""); ?>"><?php echo esc_html($data["email"] ?? "—"); ?></a></dd></div><div><dt>Phone</dt><dd><a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $data["phone"] ?? "")); ?>"><?php echo esc_html($data["phone"] ?? "—"); ?></a></dd></div></dl></article>
            <article><h4>Property & work</h4><dl><div><dt>Address</dt><dd><?php echo nl2br(esc_html(trim(($data["address"] ?? "") . ", " . ($data["postcode"] ?? ""), ", "))); ?></dd></div><div><dt>Property type</dt><dd><?php echo esc_html($data["property_type"] ?? "—"); ?></dd></div><div><dt>Customer notes</dt><dd><?php echo nl2br(esc_html($data["notes"] ?? "—")); ?></dd></div></dl></article>
        </div>
        <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-staff-form eicr-staff-operations-form">
            <input type="hidden" name="action" value="eicr_staff_update_booking"><input type="hidden" name="order_id" value="<?php echo esc_attr($order_id); ?>">
            <?php wp_nonce_field("eicr_staff_update_booking_" . $order_id, "eicr_staff_nonce"); ?>
            <label>Inspection date<input type="date" name="date" value="<?php echo esc_attr($data["date"] ?? ""); ?>"></label>
            <label>Time slot<input type="text" name="time_slot" maxlength="100" value="<?php echo esc_attr($data["time_slot"] ?? ""); ?>" placeholder="For example: 10:00–12:00"></label>
            <label class="eicr-staff-wide">Internal work note<textarea name="staff_notes" rows="3" maxlength="2000"><?php echo esc_textarea($data["staff_notes"] ?? ""); ?></textarea></label>
            <div class="eicr-staff-booking-actions"><button class="eicr-staff-secondary" type="submit" name="staff_booking_operation" value="save">Save details</button><button type="submit" name="staff_booking_operation" value="confirm"><?php echo $booking_tracking["is_confirmed"] ? "Update confirmed booking" : "Done — Confirm booking"; ?></button></div>
        </form>
    </section>
    <section class="eicr-staff-panel"><div class="eicr-staff-panel-title"><h3>Certificates</h3><span>Upload one genuine PDF for each selected service. The job completes automatically after all required PDFs are ready.</span></div>
        <div class="eicr-staff-certificate-list">
            <?php foreach ($slots as $slot) : $certificate = $certificates[$slot["key"]] ?? []; ?>
                <div><span><strong><?php echo esc_html($slot["name"]); ?></strong><?php echo $certificate ? esc_html($certificate["original_name"] ?? "PDF uploaded") : "Waiting for PDF"; ?></span><?php if ($certificate) : ?><a href="<?php echo esc_url(eicr_certificate_download_url($order_id, $slot["key"])); ?>">Download</a><?php endif; ?></div>
            <?php endforeach; ?>
        </div>
        <?php if ($slots) : ?>
        <form method="post" enctype="multipart/form-data" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" class="eicr-staff-form eicr-staff-upload-form">
            <input type="hidden" name="action" value="eicr_staff_upload_certificate"><input type="hidden" name="order_id" value="<?php echo esc_attr($order_id); ?>">
            <?php wp_nonce_field("eicr_staff_upload_certificate_" . $order_id, "eicr_staff_nonce"); ?>
            <label>Selected service<select name="service_key" required><option value="">Choose service</option><?php foreach ($slots as $slot) : ?><option value="<?php echo esc_attr($slot["key"]); ?>"><?php echo esc_html($slot["name"]); ?></option><?php endforeach; ?></select></label>
            <label>Certificate PDF<input type="file" name="certificate_pdf" accept="application/pdf,.pdf" required></label>
            <button type="submit">Upload certificate</button>
        </form>
        <?php endif; ?>
    </section>
    <?php
    return ob_get_clean();
}

function eicr_staff_quotes_html()
{
    $quotes = get_posts(["post_type" => "eicr_quote", "post_status" => "publish", "numberposts" => -1, "orderby" => "date", "order" => "DESC"]);
    ob_start();
    ?><section class="eicr-staff-panel"><div class="eicr-staff-panel-title"><h3>Quote requests</h3><span>Customer enquiries and follow-up status</span></div><div class="eicr-staff-card-list">
    <?php if (!$quotes) : ?><p class="eicr-staff-empty">No quote requests found.</p><?php endif; ?>
    <?php foreach ($quotes as $quote) : $data = (array) get_post_meta($quote->ID, "_eicr_data", true); $status = get_post_meta($quote->ID, "_eicr_staff_status", true) ?: "New"; ?>
        <article><div><span class="eicr-staff-status <?php echo $status === "Handled" ? "is-complete" : ""; ?>"><?php echo esc_html($status); ?></span><h4><?php echo esc_html($data["name"] ?? $quote->post_title); ?></h4><p><strong><?php echo esc_html($data["service"] ?? "General enquiry"); ?></strong></p><p><?php echo nl2br(esc_html($data["details"] ?? "")); ?></p><p><a href="mailto:<?php echo esc_attr($data["email"] ?? ""); ?>"><?php echo esc_html($data["email"] ?? ""); ?></a> · <?php echo esc_html($data["phone"] ?? ""); ?></p></div><form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>"><input type="hidden" name="action" value="eicr_staff_update_quote"><input type="hidden" name="quote_id" value="<?php echo esc_attr($quote->ID); ?>"><input type="hidden" name="quote_status" value="<?php echo $status === "Handled" ? "New" : "Handled"; ?>"><?php wp_nonce_field("eicr_staff_update_quote_" . $quote->ID, "eicr_staff_nonce"); ?><button type="submit"><?php echo $status === "Handled" ? "Mark new" : "Mark handled"; ?></button></form></article>
    <?php endforeach; ?></div></section><?php
    return ob_get_clean();
}

function eicr_staff_reviews_html()
{
    $reviews = get_posts(["post_type" => "eicr_review", "post_status" => ["pending", "publish"], "numberposts" => -1, "orderby" => "date", "order" => "DESC"]);
    ob_start();
    ?><section class="eicr-staff-panel"><div class="eicr-staff-panel-title"><h3>Customer reviews</h3><span>Publish only genuine customer feedback.</span></div><div class="eicr-staff-card-list">
    <?php if (!$reviews) : ?><p class="eicr-staff-empty">No reviews found.</p><?php endif; ?>
    <?php foreach ($reviews as $review) : $published = $review->post_status === "publish"; ?>
        <article><div><span class="eicr-staff-status <?php echo $published ? "is-complete" : ""; ?>"><?php echo $published ? "Published" : "Pending"; ?></span><h4><?php echo esc_html(get_post_meta($review->ID, "_eicr_reviewer", true) ?: $review->post_title); ?></h4><p><strong><?php echo esc_html(get_post_meta($review->ID, "_eicr_service", true)); ?> · <?php echo esc_html(get_post_meta($review->ID, "_eicr_rating", true)); ?>/5</strong></p><p><?php echo nl2br(esc_html($review->post_content)); ?></p></div><form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>"><input type="hidden" name="action" value="eicr_staff_update_review"><input type="hidden" name="review_id" value="<?php echo esc_attr($review->ID); ?>"><input type="hidden" name="review_status" value="<?php echo $published ? "pending" : "publish"; ?>"><?php wp_nonce_field("eicr_staff_update_review_" . $review->ID, "eicr_staff_nonce"); ?><button type="submit"><?php echo $published ? "Unpublish" : "Publish review"; ?></button></form></article>
    <?php endforeach; ?></div></section><?php
    return ob_get_clean();
}

function eicr_staff_action_allowed()
{
    return eicr_staff_portal_access();
}

function eicr_staff_action_redirect($notice, $args = [])
{
    $args = array_merge(["staff_notice" => $notice], $args);
    wp_safe_redirect(eicr_staff_dashboard_url($args));
    exit();
}

add_action("admin_post_eicr_staff_update_booking", function () {
    if (!eicr_staff_action_allowed()) {
        wp_die("Not allowed.", "Access denied", ["response" => 403]);
    }
    $order_id = absint($_POST["order_id"] ?? 0);
    if (get_post_type($order_id) !== "eicr_order" || !isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_update_booking_" . $order_id)) {
        eicr_staff_action_redirect("action_error", ["staff_tab" => "bookings"]);
    }
    $data = eicr_order_data($order_id);
    $date = sanitize_text_field(wp_unslash($_POST["date"] ?? ""));
    $data["date"] = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : "";
    $data["time_slot"] = substr(sanitize_text_field(wp_unslash($_POST["time_slot"] ?? "")), 0, 100);
    $data["staff_notes"] = substr(sanitize_textarea_field(wp_unslash($_POST["staff_notes"] ?? "")), 0, 2000);
    $operation = sanitize_key($_POST["staff_booking_operation"] ?? "save");
    if ($operation === "confirm") {
        $data["booking_status"] = "confirmed";
        $data["booking_confirmed_at"] = current_time("mysql");
        $data["booking_confirmed_by"] = get_current_user_id();
    }
    update_post_meta($order_id, "_eicr_data", $data);
    eicr_staff_action_redirect($operation === "confirm" ? "booking_confirmed" : "booking_saved", ["staff_tab" => "bookings", "order_id" => $order_id]);
});

function eicr_staff_store_certificate($order_id, $selected, $file)
{
    $data = eicr_order_data($order_id);
    $allowed = [];
    foreach (eicr_certificate_slots($order_id, $data) as $slot) {
        $allowed[$slot["key"]] = $slot["name"];
    }
    if (!isset($allowed[$selected]) || !is_array($file) || (int) ($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || (int) ($file["size"] ?? 0) < 1 || (int) $file["size"] > 15 * MB_IN_BYTES) {
        return new WP_Error("invalid_certificate", "Invalid certificate upload.");
    }
    $original = sanitize_file_name($file["name"] ?? "certificate.pdf");
    $signature = "";
    $handle = @fopen($file["tmp_name"], "rb");
    if ($handle) {
        $signature = fread($handle, 5);
        fclose($handle);
    }
    $checked = wp_check_filetype_and_ext($file["tmp_name"], $original, ["pdf" => "application/pdf"]);
    if (strtolower(pathinfo($original, PATHINFO_EXTENSION)) !== "pdf" || $signature !== "%PDF-" || ($checked["ext"] ?? "") !== "pdf") {
        return new WP_Error("invalid_pdf", "Only a genuine PDF is accepted.");
    }
    $directory = eicr_prepare_private_certificate_directory($order_id);
    if (is_wp_error($directory)) {
        return $directory;
    }
    $filename = wp_unique_filename($directory, sanitize_title($allowed[$selected]) . "-" . wp_generate_uuid4() . ".pdf");
    $destination = trailingslashit($directory) . $filename;
    if (!@move_uploaded_file($file["tmp_name"], $destination)) {
        return new WP_Error("certificate_move", "The PDF could not be stored.");
    }
    @chmod($destination, 0640);
    $certificates = eicr_order_certificates($order_id);
    if (!empty($certificates[$selected])) {
        $old = eicr_certificate_full_path($certificates[$selected]);
        if ($old && file_exists($old) && $old !== $destination) {
            @unlink($old);
        }
    }
    $certificates[$selected] = [
        "service_name" => $allowed[$selected],
        "relative_path" => absint($order_id) . "/" . $filename,
        "original_name" => $original ?: $allowed[$selected] . ".pdf",
        "uploaded_at" => time(),
        "uploaded_by" => get_current_user_id(),
    ];
    update_post_meta($order_id, "_eicr_certificates", $certificates);
    eicr_update_job_completion($order_id, $data);
    return true;
}

add_action("admin_post_eicr_staff_upload_certificate", function () {
    if (!eicr_staff_action_allowed()) {
        wp_die("Not allowed.", "Access denied", ["response" => 403]);
    }
    $order_id = absint($_POST["order_id"] ?? 0);
    if (get_post_type($order_id) !== "eicr_order" || !isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_upload_certificate_" . $order_id)) {
        eicr_staff_action_redirect("action_error", ["staff_tab" => "bookings"]);
    }
    $selected = sanitize_text_field(wp_unslash($_POST["service_key"] ?? ""));
    $result = eicr_staff_store_certificate($order_id, $selected, $_FILES["certificate_pdf"] ?? []);
    eicr_staff_action_redirect(is_wp_error($result) ? "certificate_error" : "certificate_saved", ["staff_tab" => "bookings", "order_id" => $order_id]);
});

add_action("admin_post_eicr_staff_update_quote", function () {
    if (!eicr_staff_action_allowed()) {
        wp_die("Not allowed.", "Access denied", ["response" => 403]);
    }
    $id = absint($_POST["quote_id"] ?? 0);
    if (get_post_type($id) !== "eicr_quote" || !isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_update_quote_" . $id)) {
        eicr_staff_action_redirect("action_error", ["staff_tab" => "quotes"]);
    }
    $status = sanitize_text_field(wp_unslash($_POST["quote_status"] ?? "New"));
    update_post_meta($id, "_eicr_staff_status", $status === "Handled" ? "Handled" : "New");
    eicr_staff_action_redirect("quote_saved", ["staff_tab" => "quotes"]);
});

add_action("admin_post_eicr_staff_update_review", function () {
    if (!eicr_staff_action_allowed()) {
        wp_die("Not allowed.", "Access denied", ["response" => 403]);
    }
    $id = absint($_POST["review_id"] ?? 0);
    if (get_post_type($id) !== "eicr_review" || !isset($_POST["eicr_staff_nonce"]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST["eicr_staff_nonce"])), "eicr_staff_update_review_" . $id)) {
        eicr_staff_action_redirect("action_error", ["staff_tab" => "reviews"]);
    }
    $status = sanitize_key($_POST["review_status"] ?? "pending");
    if ($status === "publish" && !get_post_meta($id, "_eicr_review_consent_time", true)) {
        eicr_staff_action_redirect("action_error", ["staff_tab" => "reviews"]);
    }
    wp_update_post(["ID" => $id, "post_status" => $status === "publish" ? "publish" : "pending"]);
    eicr_staff_action_redirect("review_saved", ["staff_tab" => "reviews"]);
});

add_action("admin_menu", function () {
    add_submenu_page("eicr-control", "Staff Accounts", "Staff Accounts", "manage_options", "eicr-staff-accounts", "eicr_staff_accounts_page");
    add_submenu_page("eicr-control", "Payment Overview", "Payment Overview", "manage_options", "eicr-payment-overview", "eicr_payment_overview_page");
}, 25);

add_action("admin_menu", function () {
    remove_submenu_page("eicr-control", "edit.php?post_type=eicr_order");
    remove_submenu_page("eicr-control", "edit.php?post_type=eicr_quote");
    remove_submenu_page("eicr-control", "edit.php?post_type=eicr_review");
}, 999);

function eicr_staff_admin_notice()
{
    $key = sanitize_key($_GET["staff_admin_notice"] ?? "");
    $messages = [
        "created" => "Staff account created.",
        "updated" => "Staff account updated.",
        "error" => "The staff account could not be changed. Check the fields and try again.",
    ];
    return isset($messages[$key]) ? '<div class="notice notice-' . ($key === "error" ? "error" : "success") . '"><p>' . esc_html($messages[$key]) . '</p></div>' : "";
}

function eicr_staff_accounts_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    $staff = get_users(["role" => "eicr_staff", "orderby" => "registered", "order" => "DESC"]);
    $verification_email = eicr_staff_admin_verification_email();
    ?>
    <div class="wrap eicr-admin-wrap"><h1>Staff Accounts</h1><?php echo eicr_staff_admin_notice(); ?><p>Create one operations account that can be used from up to five owner-approved browsers. Staff cannot access WordPress, payment information, prices, colours or public website pages after signing in.</p>
        <div class="notice notice-info inline"><p><strong>New-browser verification:</strong> codes are sent only to the WordPress Administration Email: <code><?php echo esc_html($verification_email ?: "Not configured"); ?></code>. This address can be changed only by an administrator in <a href="<?php echo esc_url(admin_url("options-general.php")); ?>">Settings → General</a>.</p></div>
        <h2>Create staff account</h2><form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>"><input type="hidden" name="action" value="eicr_create_staff_account"><?php wp_nonce_field("eicr_create_staff_account"); ?><table class="form-table"><tr><th><label for="staff_name">Full name</label></th><td><input class="regular-text" id="staff_name" name="staff_name" required></td></tr><tr><th><label for="staff_email">Work email</label></th><td><input class="regular-text" type="email" id="staff_email" name="staff_email" required></td></tr><tr><th><label for="staff_password">Temporary password</label></th><td><input class="regular-text" type="password" id="staff_password" name="staff_password" minlength="12" required><p class="description">At least 12 characters. Share it privately and reset it here when required.</p></td></tr></table><?php submit_button("Create staff account"); ?></form>
        <h2>Existing staff</h2><table class="widefat striped"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Trusted browsers</th><th>Reset password / access</th></tr></thead><tbody><?php if (!$staff) : ?><tr><td colspan="5">No staff accounts created.</td></tr><?php endif; ?><?php foreach ($staff as $member) : $active = get_user_meta($member->ID, "_eicr_staff_active", true) !== "0"; $browser_count = count(eicr_staff_trusted_browsers($member->ID)); ?><tr><td><?php echo esc_html($member->display_name); ?></td><td><?php echo esc_html($member->user_email); ?></td><td><?php echo $active ? "Active" : "Inactive"; ?></td><td><?php echo esc_html($browser_count . " of 5"); ?></td><td><form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="hidden" name="action" value="eicr_update_staff_account"><input type="hidden" name="staff_id" value="<?php echo esc_attr($member->ID); ?>"><?php wp_nonce_field("eicr_update_staff_account_" . $member->ID); ?><input type="password" name="new_password" minlength="12" placeholder="New password (optional)"><button class="button" name="staff_operation" value="reset">Save password</button><button class="button" name="staff_operation" value="revoke">Revoke browsers</button><button class="button" name="staff_operation" value="toggle"><?php echo $active ? "Deactivate" : "Activate"; ?></button></form></td></tr><?php endforeach; ?></tbody></table>
        <p><strong>Private staff URL:</strong> <a href="<?php echo esc_url(eicr_staff_login_url()); ?>" target="_blank" rel="noopener"><?php echo esc_html(eicr_staff_login_url()); ?></a></p>
    </div>
    <?php
}

add_action("admin_post_eicr_create_staff_account", function () {
    if (!current_user_can("manage_options")) {
        wp_die("Not allowed.");
    }
    check_admin_referer("eicr_create_staff_account");
    $name = sanitize_text_field(wp_unslash($_POST["staff_name"] ?? ""));
    $email = sanitize_email(wp_unslash($_POST["staff_email"] ?? ""));
    $password = (string) wp_unslash($_POST["staff_password"] ?? "");
    if (!$name || !is_email($email) || email_exists($email) || strlen($password) < 12) {
        wp_safe_redirect(admin_url("admin.php?page=eicr-staff-accounts&staff_admin_notice=error"));
        exit();
    }
    $base = sanitize_user(strstr($email, "@", true), true) ?: "operations";
    $login = $base;
    $i = 1;
    while (username_exists($login)) {
        $login = $base . $i++;
    }
    $id = wp_insert_user(["user_login" => $login, "user_email" => $email, "display_name" => $name, "user_pass" => $password, "role" => "eicr_staff"]);
    if (!is_wp_error($id)) {
        update_user_meta($id, "_eicr_staff_active", "1");
    }
    wp_safe_redirect(admin_url("admin.php?page=eicr-staff-accounts&staff_admin_notice=" . (is_wp_error($id) ? "error" : "created")));
    exit();
});

add_action("admin_post_eicr_update_staff_account", function () {
    if (!current_user_can("manage_options")) {
        wp_die("Not allowed.");
    }
    $id = absint($_POST["staff_id"] ?? 0);
    check_admin_referer("eicr_update_staff_account_" . $id);
    $user = get_user_by("id", $id);
    if (!$user || !in_array("eicr_staff", (array) $user->roles, true)) {
        wp_safe_redirect(admin_url("admin.php?page=eicr-staff-accounts&staff_admin_notice=error"));
        exit();
    }
    $operation = sanitize_key($_POST["staff_operation"] ?? "");
    if ($operation === "toggle") {
        $active = get_user_meta($id, "_eicr_staff_active", true) !== "0";
        update_user_meta($id, "_eicr_staff_active", $active ? "0" : "1");
        if ($active) {
            eicr_staff_revoke_trusted_browsers($id);
        }
    } elseif ($operation === "reset") {
        $password = (string) wp_unslash($_POST["new_password"] ?? "");
        if (strlen($password) < 12) {
            wp_safe_redirect(admin_url("admin.php?page=eicr-staff-accounts&staff_admin_notice=error"));
            exit();
        }
        wp_set_password($password, $id);
        eicr_staff_revoke_trusted_browsers($id);
    } elseif ($operation === "revoke") {
        eicr_staff_revoke_trusted_browsers($id);
    }
    wp_safe_redirect(admin_url("admin.php?page=eicr-staff-accounts&staff_admin_notice=updated"));
    exit();
});

function eicr_payment_overview_page()
{
    if (!current_user_can("manage_options")) {
        return;
    }
    $orders = get_posts(["post_type" => "eicr_order", "post_status" => "publish", "numberposts" => 200, "orderby" => "date", "order" => "DESC"]);
    $paid_total = 0;
    $paid_count = 0;
    foreach ($orders as $order) {
        $data = eicr_order_data($order->ID);
        if (($data["status"] ?? "") === "Paid") {
            $paid_total += (float) ($data["amount"] ?? 0);
            $paid_count++;
        }
    }
    ?>
    <div class="wrap eicr-admin-wrap">
        <h1>Payment Overview</h1>
        <?php if (sanitize_key($_GET["payment_notice"] ?? "") === "updated") : ?><div class="notice notice-success is-dismissible"><p>Payment status updated.</p></div><?php endif; ?>
        <p>Owner-only payment information. Operations staff cannot access this screen or these values.</p>
        <div class="eicr-admin-cards"><div class="eicr-admin-card"><strong><?php echo esc_html($paid_count); ?></strong><span>Paid bookings</span></div><div class="eicr-admin-card"><strong>£<?php echo esc_html(number_format($paid_total, 2)); ?></strong><span>Paid total shown</span></div><div class="eicr-admin-card"><strong><?php echo esc_html(count($orders)); ?></strong><span>Recent records</span></div></div>
        <p><a class="button button-primary" href="<?php echo esc_url(admin_url("admin.php?page=eicr-payments")); ?>">Payment & Stripe settings</a></p>
        <table class="widefat striped"><thead><tr><th>Reference</th><th>Date</th><th>Customer email</th><th>Method</th><th>Status</th><th>Amount</th><th>Action</th></tr></thead><tbody>
        <?php if (!$orders) : ?><tr><td colspan="7">No payment records found.</td></tr><?php endif; ?>
        <?php foreach ($orders as $order) :
            $data = eicr_order_data($order->ID);
            $method = sanitize_key($data["payment_method"] ?? "");
            $is_paid = function_exists("eicr_order_payment_cleared") && eicr_order_payment_cleared($order->ID, $data);
            ?>
            <tr><td><strong><?php echo esc_html($data["reference"] ?? $order->post_title); ?></strong></td><td><?php echo esc_html(get_the_date("j M Y", $order)); ?></td><td><?php echo esc_html($data["email"] ?? "—"); ?></td><td><?php echo esc_html(ucwords($method ?: "—")); ?></td><td><?php echo esc_html($data["status"] ?? "Pending"); ?></td><td>£<?php echo esc_html(number_format((float) ($data["amount"] ?? 0), 2)); ?></td><td>
                <?php if (in_array($method, ["bank", "cash"], true)) : ?>
                    <form method="post" action="<?php echo esc_url(admin_url("admin-post.php")); ?>"><input type="hidden" name="action" value="eicr_set_manual_payment"><input type="hidden" name="order_id" value="<?php echo esc_attr($order->ID); ?>"><input type="hidden" name="payment_status" value="<?php echo $is_paid ? "pending" : "paid"; ?>"><?php wp_nonce_field("eicr_set_manual_payment_" . $order->ID); ?><button class="button" type="submit"><?php echo $is_paid ? "Mark pending" : "Mark paid"; ?></button></form>
                <?php elseif ($method === "stripe") : ?>Automatic via Stripe<?php else : ?>No manual action<?php endif; ?>
            </td></tr>
        <?php endforeach; ?>
        </tbody></table>
    </div>
    <?php
}

add_action("admin_post_eicr_set_manual_payment", function () {
    if (!current_user_can("manage_options")) {
        wp_die("Not allowed.", "Access denied", ["response" => 403]);
    }
    $order_id = absint($_POST["order_id"] ?? 0);
    check_admin_referer("eicr_set_manual_payment_" . $order_id);
    if (get_post_type($order_id) !== "eicr_order") {
        wp_die("Booking not found.", "Invalid booking", ["response" => 404]);
    }
    $data = eicr_order_data($order_id);
    $method = sanitize_key($data["payment_method"] ?? "");
    if (!in_array($method, ["bank", "cash"], true)) {
        wp_die("Only bank or cash bookings can be updated manually.", "Invalid payment method", ["response" => 400]);
    }
    $paid = sanitize_key($_POST["payment_status"] ?? "") === "paid";
    $was_paid = function_exists("eicr_order_payment_cleared") && eicr_order_payment_cleared($order_id, $data);
    $data["status"] = $paid ? "Paid" : "Pending";
    $data["manual_payment_updated_at"] = current_time("mysql");
    $data["manual_payment_updated_by"] = get_current_user_id();
    update_post_meta($order_id, "_eicr_data", $data);
    if (!$paid) {
        delete_post_meta($order_id, "_eicr_completion_email_sent");
    }
    if ($paid && !$was_paid && function_exists("eicr_send_invoice")) {
        eicr_send_invoice($order_id, $data, true);
    }
    if (function_exists("eicr_update_job_completion")) {
        eicr_update_job_completion($order_id, $data);
    }
    wp_safe_redirect(admin_url("admin.php?page=eicr-payment-overview&payment_notice=updated"));
    exit();
});

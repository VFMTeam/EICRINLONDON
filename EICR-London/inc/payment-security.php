<?php
if (!defined("ABSPATH")) {
    exit();
}
add_action("wp_ajax_nopriv_eicr_booking_v2", "eicr_secure_booking_submit");
add_action("wp_ajax_eicr_booking_v2", "eicr_secure_booking_submit");
function eicr_secure_scalar($key)
{
    return isset($_POST[$key]) && !is_array($_POST[$key])
        ? wp_unslash($_POST[$key])
        : "";
}
function eicr_valid_uk_postcode($value)
{
    $value = strtoupper(trim(preg_replace("/\s+/", " ", $value)));
    return (bool) preg_match(
        '/^(GIR 0AA|(?:[A-Z]{1,2}\d[A-Z\d]?|\d[A-Z]{2})\s?\d[A-Z]{2})$/',
        $value,
    );
}
function eicr_secure_payment_intent($order_id, $data, $token)
{
    $settings = get_option("eicr_settings", []);
    if (empty($settings["stripe_secret"])) {
        return new WP_Error("stripe", "Stripe secret key is not configured.");
    }
    $amount = (int) round(((float) $data["amount"]) * 100);
    if ($amount < 50) {
        return new WP_Error("amount", "The payment amount is invalid.");
    }
    $response = wp_remote_post("https://api.stripe.com/v1/payment_intents", [
        "headers" => [
            "Authorization" => "Bearer " . $settings["stripe_secret"],
            "Idempotency-Key" => hash(
                "sha256",
                "eicr-booking-" . $order_id . "-" . $token,
            ),
        ],
        "body" => [
            "amount" => $amount,
            "currency" => "gbp",
            "payment_method_types[]" => "card",
            "receipt_email" => $data["email"],
            "description" => "EICR in London " . $data["reference"],
            "metadata[order_id]" => $order_id,
            "metadata[reference]" => $data["reference"],
        ],
        "timeout" => 30,
    ]);
    if (is_wp_error($response)) {
        return $response;
    }
    $json = json_decode(wp_remote_retrieve_body($response), true);
    return !empty($json["client_secret"])
        ? $json
        : new WP_Error(
            "stripe",
            $json["error"]["message"] ?? "Stripe Payment could not start.",
        );
}
function eicr_existing_booking_response($token)
{
    $hash = hash("sha256", $token);
    $orders = get_posts([
        "post_type" => "eicr_order",
        "post_status" => "publish",
        "numberposts" => 1,
        "meta_key" => "_eicr_request_token_hash",
        "meta_value" => $hash,
        "orderby" => "ID",
        "order" => "DESC",
    ]);
    if (!$orders) {
        return false;
    }
    $order_id = $orders[0]->ID;
    if (function_exists("eicr_customer_can_access_order") && !eicr_customer_can_access_order($order_id)) {
        return false;
    }
    $data = get_post_meta($order_id, "_eicr_data", true);
    if (!is_array($data)) {
        return false;
    }
    if (
        ($data["payment_method"] ?? "") === "stripe" &&
        !empty($data["stripe_payment_intent"])
    ) {
        $intent = eicr_retrieve_payment_intent($data["stripe_payment_intent"]);
        if (is_wp_error($intent)) {
            wp_send_json_error(
                ["message" => $intent->get_error_message()],
                503,
            );
        }
        if (($intent["status"] ?? "") === "succeeded") {
            $paid = eicr_mark_order_paid_from_intent($order_id, $intent);
            if (is_wp_error($paid)) {
                wp_send_json_error(
                    ["message" => $paid->get_error_message()],
                    400,
                );
            }
            wp_send_json_success([
                "message" =>
                    "Payment verified. Booking reference: " .
                    $data["reference"],
                "reference" => $data["reference"],
                "amount" => $data["amount"],
            ]);
        }
        if (!empty($intent["client_secret"])) {
            wp_send_json_success([
                "message" => "Continue your secure card payment.",
                "requires_payment" => true,
                "client_secret" => $intent["client_secret"],
                "payment_intent" => $intent["id"],
                "order_id" => $order_id,
                "reference" => $data["reference"],
                "amount" => $data["amount"],
            ]);
        }
    }
    wp_send_json_success([
        "message" =>
            "Booking already received. Reference: " . $data["reference"],
        "reference" => $data["reference"],
        "amount" => $data["amount"],
    ]);
}
function eicr_secure_booking_submit()
{
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user()) {
        wp_send_json_error(
            [
                "message" =>
                    "Please sign in or create a customer account before booking.",
                "redirect" => eicr_customer_booking_login_url(
                    eicr_customer_booking_url(),
                ),
            ],
            401,
        );
    }
    $booking_user = wp_get_current_user();
    check_ajax_referer("eicr_public", "nonce");
    eicr_public_rate_limit("booking", 15, 10 * MINUTE_IN_SECONDS);
    $token = sanitize_text_field(eicr_secure_scalar("request_token"));
    if (!preg_match('/^[A-Za-z0-9_-]{20,80}$/', $token)) {
        wp_send_json_error(
            ["message" => "Please refresh the booking page and try again."],
            400,
        );
    }
    $lock = "eicr_booking_lock_" . hash("sha256", $token);
    if (get_transient($lock)) {
        if (eicr_existing_booking_response($token) === false) {
            wp_send_json_error(
                [
                    "message" =>
                        "This booking is already being processed. Please wait a moment and retry.",
                ],
                409,
            );
        }
    }
    set_transient($lock, 1, 10 * MINUTE_IN_SECONDS);
    $fail = static function ($message, $status = 400) use ($lock) {
        delete_transient($lock);
        wp_send_json_error(["message" => $message], $status);
    };
    $kind = sanitize_key(eicr_secure_scalar("property_kind"));
    if (!in_array($kind, ["residential", "commercial"], true)) {
        $fail("Choose a valid property type.");
    }
    $bedrooms = absint(eicr_secure_scalar("bedrooms"));
    $floors = absint(eicr_secure_scalar("floors"));
    if (
        $kind === "residential" &&
        ($bedrooms > 6 || $floors < 1 || $floors > 5)
    ) {
        $fail("Choose valid property details.");
    }
    $commercial_type = sanitize_key(eicr_secure_scalar("commercial_type"));
    if (
        $kind === "commercial" &&
        !in_array(
            $commercial_type,
            ["pub-restaurant", "shop", "warehouse", "office", "other"],
            true,
        )
    ) {
        $fail("Choose a valid commercial property type.");
    }
    $parking_raw = eicr_secure_scalar("parking");
    $congestion_raw = eicr_secure_scalar("congestion");
    $method = sanitize_key(eicr_secure_scalar("payment_method"));
    if (!in_array($parking_raw, ["0", "5"], true)) {
        $fail("Choose a valid parking option.");
    }
    if (!in_array($congestion_raw, ["0", "18"], true)) {
        $fail("Choose a valid congestion-zone option.");
    }
    if (!in_array($method, ["bank", "stripe", "cash"], true)) {
        $fail("Choose a valid payment method.");
    }
    if (eicr_secure_scalar("terms_accepted") !== "1") {
        $fail("Please accept the Terms & Conditions to submit the booking.");
    }
    $parking = (float) $parking_raw;
    $congestion = (float) $congestion_raw;
    $ids = array_values(
        array_unique(
            array_filter(
                array_map("absint", (array) ($_POST["service_ids"] ?? [])),
            ),
        ),
    );
    if (!$ids || count($ids) > 20) {
        $fail("Select at least one valid service.");
    }
    $allowed = eicr_booking_service_sets()[$kind];
    $names = [];
    $items = [];
    $amount = 0.0;
    foreach ($ids as $id) {
        $service = get_post($id);
        if (
            !$service ||
            $service->post_type !== "eicr_service" ||
            !isset($allowed[$service->post_name])
        ) {
            $fail("One or more selected services are invalid.");
        }
        $price = eicr_booking_price(
            $service,
            $kind,
            $bedrooms,
            $floors,
            $commercial_type,
        );
        if (!is_finite($price) || $price <= 0 || $price > 100000) {
            $fail("A selected service has an invalid price.");
        }
        $name = $allowed[$service->post_name];
        $names[] = $name;
        $items[] = ["name" => $name, "price" => round($price, 2)];
        $amount += $price;
    }
    $amount = round($amount + $parking + $congestion, 2);
    if ($amount <= 0 || $amount > 200000) {
        $fail("The booking total is invalid.");
    }
    $first = sanitize_text_field(eicr_secure_scalar("first_name"));
    $last = sanitize_text_field(eicr_secure_scalar("last_name"));
    $email = sanitize_email($booking_user->user_email);
    $phone = sanitize_text_field(eicr_secure_scalar("phone"));
    $address = sanitize_text_field(eicr_secure_scalar("address"));
    $postcode = strtoupper(sanitize_text_field(eicr_secure_scalar("postcode")));
    $date = sanitize_text_field(eicr_secure_scalar("date"));
    $slot_key = sanitize_key(eicr_secure_scalar("time_slot"));
    $slot_map = [
        "morning" => "08:00 AM - 01:00 PM",
        "afternoon" => "01:00 PM - 06:00 PM",
    ];
    $slot = $slot_map[$slot_key] ?? "";
    if (
        !$first ||
        !$last ||
        !is_email($email) ||
        !$phone ||
        !$address ||
        !$postcode ||
        !$date
    ) {
        $fail("Complete all required fields.");
    }
    if (!eicr_valid_uk_postcode($postcode)) {
        $fail("Enter a valid UK postcode.");
    }
    $date_obj = DateTimeImmutable::createFromFormat(
        "!Y-m-d",
        $date,
        wp_timezone(),
    );
    $today = new DateTimeImmutable("today", wp_timezone());
    if (
        !$date_obj ||
        $date_obj->format("Y-m-d") !== $date ||
        $date_obj < $today
    ) {
        $fail("Choose today or a future inspection date.");
    }
    if (!isset($slot_map[$slot_key])) {
        $fail("Choose a valid inspection time.");
    }
    $postcode_key = preg_replace("/[^A-Z0-9]/", "", $postcode);
    $ref =
        "EICR-" .
        substr($postcode_key, 0, 8) .
        "-" .
        strtoupper(wp_generate_password(6, false, false));
    $data = [
        "name" => trim($first . " " . $last),
        "first_name" => $first,
        "last_name" => $last,
        "email" => $email,
        "phone" => $phone,
        "service" => implode(", ", $names),
        "services" => $names,
        "service_items" => $items,
        "amount" => $amount,
        "property_type" =>
            $kind === "commercial"
                ? "Commercial - " .
                    ucwords(str_replace("-", " ", $commercial_type))
                : "Residential",
        "bedrooms" => $kind === "residential" ? ($bedrooms ?: "Studio") : "",
        "floors" => $kind === "residential" ? $floors : "",
        "date" => $date,
        "time_slot" => $slot,
        "address" => $address,
        "postcode" => $postcode,
        "parking_charge" => $parking,
        "congestion_charge" => $congestion,
        "notes" => sanitize_textarea_field(eicr_secure_scalar("notes")),
        "payment_method" => $method,
        "terms_accepted_at" => current_time("mysql", true),
        "terms_version" => "2026-08-07",
        "status" => "Pending",
        "reference" => $ref,
        "invoice_number" => $ref,
    ];
    $order = wp_insert_post(
        [
            "post_type" => "eicr_order",
            "post_status" => "publish",
            "post_title" => $ref . " - " . $data["name"],
        ],
        true,
    );
    if (is_wp_error($order) || !$order) {
        $fail("The booking could not be saved. Please try again.", 500);
    }
    update_post_meta($order, "_eicr_data", $data);
    update_post_meta(
        $order,
        "_eicr_request_token_hash",
        hash("sha256", $token),
    );
    if (function_exists("eicr_assign_order_customer")) {
        eicr_assign_order_customer($order, $data);
    }
    if ($method === "stripe") {
        if (empty($_POST["card_elements"])) {
            wp_delete_post($order, true);
            $fail("Secure card details are required.");
        }
        $intent = eicr_secure_payment_intent($order, $data, $token);
        if (is_wp_error($intent)) {
            wp_delete_post($order, true);
            $fail($intent->get_error_message(), 500);
        }
        $data["stripe_payment_intent"] = $intent["id"];
        update_post_meta($order, "_eicr_data", $data);
        wp_send_json_success([
            "message" => "Confirm your secure card payment.",
            "requires_payment" => true,
            "client_secret" => $intent["client_secret"],
            "payment_intent" => $intent["id"],
            "order_id" => $order,
            "reference" => $ref,
            "amount" => $amount,
            "arrival_note" =>
                "After confirmation, the attending specialist will contact the customer before travelling to the property.",
        ]);
    }
    eicr_send_invoice($order, $data, false);
    wp_send_json_success([
        "message" => "Booking received. Reference: " . $ref,
        "arrival_note" =>
            "After confirmation, the attending specialist will contact the customer before travelling to the property.",
        "amount" => $amount,
        "formatted_total" => "\xC2\xA3" . number_format($amount, 2),
    ]);
}
function eicr_secure_stripe_signature($payload, $header, $secret)
{
    $timestamp = 0;
    $signatures = [];
    foreach (explode(",", (string) $header) as $part) {
        $pair = array_map("trim", explode("=", $part, 2));
        if (count($pair) !== 2) {
            continue;
        }
        if ($pair[0] === "t") {
            $timestamp = (int) $pair[1];
        }
        if ($pair[0] === "v1" && preg_match('/^[a-f0-9]{64}$/i', $pair[1])) {
            $signatures[] = strtolower($pair[1]);
        }
    }
    if (!$timestamp || !$signatures || abs(time() - $timestamp) > 300) {
        return false;
    }
    $expected = hash_hmac("sha256", $timestamp . "." . $payload, $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            return true;
        }
    }
    return false;
}
function eicr_secure_stripe_webhook(WP_REST_Request $request)
{
    $settings = get_option("eicr_settings", []);
    $payload = $request->get_body();
    if (
        empty($settings["stripe_webhook_secret"]) ||
        !eicr_secure_stripe_signature(
            $payload,
            $request->get_header("stripe-signature"),
            $settings["stripe_webhook_secret"],
        )
    ) {
        return new WP_REST_Response(["error" => "Invalid signature"], 400);
    }
    $event = json_decode($payload, true);
    if (!is_array($event)) {
        return new WP_REST_Response(["error" => "Invalid payload"], 400);
    }
    $type = $event["type"] ?? "";
    $object = $event["data"]["object"] ?? [];
    if ($type === "payment_intent.succeeded") {
        $result = eicr_mark_order_paid_from_intent(
            absint($object["metadata"]["order_id"] ?? 0),
            $object,
        );
        if (is_wp_error($result)) {
            return new WP_REST_Response(
                ["error" => $result->get_error_message()],
                400,
            );
        }
    }
    return new WP_REST_Response(["received" => true], 200);
}
add_action(
    "rest_api_init",
    function () {
        register_rest_route(
            "eicr/v1",
            "/stripe-webhook",
            [
                "methods" => "POST",
                "callback" => "eicr_secure_stripe_webhook",
                "permission_callback" => "__return_true",
            ],
            true,
        );
    },
    20,
);
add_action(
    "wp_enqueue_scripts",
    function () {
        if (is_page("booking")) {
            wp_enqueue_script(
                "eicr-payment-guard",
                EICR_THEME_URI . "/assets/js/payment-guard.js",
                ["eicr-theme"],
                filemtime(EICR_THEME_DIR . "/assets/js/payment-guard.js"),
                ["strategy" => "defer", "in_footer" => true],
            );
        }
    },
    20,
);
add_filter(
    "rest_endpoints",
    function ($endpoints) {
        $route = "/eicr/v1/stripe-webhook";
        if (isset($endpoints[$route])) {
            foreach ($endpoints[$route] as &$handler) {
                if (isset($handler["callback"])) {
                    $handler["callback"] = "eicr_secure_stripe_webhook";
                }
            };
        }
        return $endpoints;
    },
    99,
);
function eicr_live_service_price($slug, $fallback)
{
    $service = get_page_by_path(sanitize_title($slug), OBJECT, "eicr_service");
    if (!$service) {
        return (float) $fallback;
    }
    $price = get_post_meta($service->ID, "_eicr_price", true);
    return is_numeric($price) && $price > 0
        ? (float) $price
        : (float) $fallback;
}
function eicr_apply_live_prices_to_html($html)
{
    $defaults = [];
    foreach (eicr_service_catalog() as $row) {
        $defaults[$row[0]] = (float) $row[2];
    }
    return preg_replace_callback(
        "/<article\b[^>]*>.*?<\/article>/si",
        function ($match) use ($defaults) {
            $article = $match[0];
            if (
                !preg_match(
                    "~(?:booking\?service=|/services/)([a-z0-9-]+)~i",
                    $article,
                    $slug_match,
                )
            ) {
                return $article;
            }
            $slug = sanitize_title($slug_match[1]);
            if (!isset($defaults[$slug])) {
                return $article;
            }
            $service = eicr_booking_service_by_slug($slug);
            if (!$service) {
                return $article;
            }
            $base = eicr_live_service_price($slug, $defaults[$slug]);
            $delta = $base - $defaults[$slug];
            if (abs($delta) >= 0.001) {
                $article = preg_replace_callback(
                    "/£(\d+(?:\.\d{1,2})?)/",
                    function ($price_match) use ($delta) {
                        return "£" .
                            number_format(
                                max(0, (float) $price_match[1] + $delta),
                                2,
                                ".",
                                "",
                            );
                    },
                    $article,
                );
            }
            if ($slug === "gas-safety") {
                $combo = eicr_live_service_price(
                    "boiler-gas-safety-combo",
                    149,
                );
                $article = preg_replace(
                    "/(Special Offer:[^<]*<\/span><b[^>]*>)£[0-9.]+/i",
                    '$1£' . number_format($combo, 2, ".", ""),
                    $article,
                );
            }
            $state = eicr_service_price_state($service->ID);
            if ($state["regular"] > 0) {
                $display = eicr_service_price_html($service->ID);
                $article = preg_replace(
                    '~(<span class="shrink-0[^"]*"[^>]*>).*?(</span>)~s',
                    '$1' . $display . '$2',
                    $article,
                    1,
                );
            }
            return $article;
        },
        $html,
    );
}

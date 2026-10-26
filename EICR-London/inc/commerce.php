<?php
if (!defined("ABSPATH")) {
    exit();
}
function eicr_quote_shortcode()
{
    ob_start();
    $requested = sanitize_title($_GET["service"] ?? "");
    ?><form class="eicr-form" data-eicr-form="quote"><div class="eicr-grid"><label>Name *<input name="name" autocomplete="name" maxlength="100" required></label><label>Email *<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>Phone *<input name="phone" type="tel" autocomplete="tel" maxlength="50" required></label><label>Service<select name="service" required><option value="">Select service</option><?php foreach (
    eicr_services()
    as $service
): ?><option value="<?php echo esc_attr(
    $service->post_title,
); ?>" <?php selected($service->post_name, $requested); ?>><?php echo esc_html(
    $service->post_title,
); ?></option><?php endforeach; ?></select></label></div><label>Property and work details *<textarea name="details" maxlength="5000" required></textarea></label><input class="eicr-review-hp" type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true"><input type="hidden" name="action" value="eicr_quote"><input type="hidden" name="nonce" value="<?php echo esc_attr(
    wp_create_nonce("eicr_public"),
); ?>"><button type="submit">Request quote</button><p class="eicr-response" role="status"></p></form><?php return ob_get_clean();
}
add_shortcode("eicr_quote", "eicr_quote_shortcode");
add_action("wp_ajax_nopriv_eicr_quote", "eicr_quote_submit");
add_action("wp_ajax_eicr_quote", "eicr_quote_submit");
function eicr_quote_submit()
{
    check_ajax_referer("eicr_public", "nonce");
    eicr_public_rate_limit("quote", 6, 10 * MINUTE_IN_SECONDS);
    if (!empty($_POST["company_website"])) {
        wp_send_json_success(["message" => "Quote request received.", "suppressed" => true]);
    }
    $data = [
        "name" => sanitize_text_field(wp_unslash($_POST["name"] ?? "")),
        "email" => sanitize_email(wp_unslash($_POST["email"] ?? "")),
        "phone" => sanitize_text_field(wp_unslash($_POST["phone"] ?? "")),
        "service" => sanitize_text_field(wp_unslash($_POST["service"] ?? "")),
        "details" => sanitize_textarea_field(wp_unslash($_POST["details"] ?? "")),
    ];
    $valid_services = function_exists("eicr_services") ? wp_list_pluck(eicr_services(), "post_title") : [];
    if (
        !$data["name"] ||
        !is_email($data["email"]) ||
        !$data["phone"] ||
        !$data["service"] ||
        !$data["details"] ||
        !$valid_services ||
        !in_array($data["service"], $valid_services, true) ||
        strlen($data["name"]) > 100 ||
        strlen($data["email"]) > 254 ||
        strlen($data["phone"]) > 50 ||
        strlen($data["service"]) > 180 ||
        strlen($data["details"]) > 5000
    ) {
        wp_send_json_error(["message" => "Complete all required fields."], 400);
    }
    $id = wp_insert_post([
        "post_type" => "eicr_quote",
        "post_status" => "publish",
        "post_title" =>
            "Quote — " . $data["name"] . " — " . current_time("Y-m-d"),
    ], true);
    if (is_wp_error($id) || !$id) {
        wp_send_json_error(["message" => "The quote request could not be saved. Please try again."], 500);
    }
    update_post_meta($id, "_eicr_data", $data);
    $o = get_option("eicr_settings", []);
    wp_mail(
        $o["email"] ?? get_option("admin_email"),
        "New quote request",
        $data["name"] .
            " requested " .
            $data["service"] .
            "
" .
            $data["details"],
    );
    wp_send_json_success(["message" => "Quote request received.", "suppressed" => false]);
}
function eicr_create_checkout($order_id, $d)
{
    $o = get_option("eicr_settings", []);
    if (empty($o["stripe_secret"])) {
        return new WP_Error("stripe", "Stripe secret key is not configured.");
    }
    $body = [
        "mode" => "payment",
        "success_url" => add_query_arg(
            ["eicr_payment" => "success", "order" => $order_id],
            home_url("/booking/"),
        ),
        "cancel_url" => add_query_arg(
            "eicr_payment",
            "cancelled",
            home_url("/booking/"),
        ),
        "customer_email" => $d["email"],
        "metadata[order_id]" => $order_id,
        "line_items[0][quantity]" => 1,
        "line_items[0][price_data][currency]" => "gbp",
        "line_items[0][price_data][unit_amount]" => (int) round(
            $d["amount"] * 100,
        ),
        "line_items[0][price_data][product_data][name]" => $d["service"],
    ];
    $r = wp_remote_post("https://api.stripe.com/v1/checkout/sessions", [
        "headers" => ["Authorization" => "Bearer " . $o["stripe_secret"]],
        "body" => $body,
        "timeout" => 30,
    ]);
    if (is_wp_error($r)) {
        return $r;
    }
    $json = json_decode(wp_remote_retrieve_body($r), true);
    return !empty($json["url"])
        ? $json["url"]
        : new WP_Error(
            "stripe",
            $json["error"]["message"] ?? "Stripe Checkout could not start.",
        );
}
function eicr_create_payment_intent($order_id, $d)
{
    $o = get_option("eicr_settings", []);
    if (empty($o["stripe_secret"])) {
        return new WP_Error("stripe", "Stripe secret key is not configured.");
    }
    $r = wp_remote_post("https://api.stripe.com/v1/payment_intents", [
        "headers" => ["Authorization" => "Bearer " . $o["stripe_secret"]],
        "body" => [
            "amount" => (int) round($d["amount"] * 100),
            "currency" => "gbp",
            "payment_method_types[]" => "card",
            "receipt_email" => $d["email"],
            "description" => "EICR in London " . $d["reference"],
            "metadata[order_id]" => $order_id,
            "metadata[reference]" => $d["reference"],
        ],
        "timeout" => 30,
    ]);
    if (is_wp_error($r)) {
        return $r;
    }
    $json = json_decode(wp_remote_retrieve_body($r), true);
    return !empty($json["client_secret"])
        ? $json
        : new WP_Error(
            "stripe",
            $json["error"]["message"] ?? "Stripe Payment could not start.",
        );
}
add_action("rest_api_init", function () {
    register_rest_route("eicr/v1", "/stripe-webhook", [
        "methods" => "POST",
        "callback" => "eicr_stripe_webhook",
        "permission_callback" => "__return_true",
    ]);
});
function eicr_stripe_webhook(WP_REST_Request $r)
{
    $o = get_option("eicr_settings", []);
    $payload = $r->get_body();
    $sig = $r->get_header("stripe-signature");
    if (
        empty($o["stripe_webhook_secret"]) ||
        !eicr_verify_stripe($payload, $sig, $o["stripe_webhook_secret"])
    ) {
        return new WP_REST_Response(["error" => "Invalid signature"], 400);
    }
    $event = json_decode($payload, true);
    $type = $event["type"] ?? "";
    $object = $event["data"]["object"] ?? [];
    if (
        in_array(
            $type,
            ["checkout.session.completed", "payment_intent.succeeded"],
            true,
        )
    ) {
        $order = absint($object["metadata"]["order_id"] ?? 0);
        $d = get_post_meta($order, "_eicr_data", true);
        if ($order && $d) {
            $was_paid = ($d["status"] ?? "") === "Paid";
            $d["status"] = "Paid";
            $d["stripe_payment"] = $object["id"] ?? "";
            update_post_meta($order, "_eicr_data", $d);
            if (!$was_paid) {
                eicr_send_invoice($order, $d, true);
            }
            if (function_exists("eicr_update_job_completion")) {
                eicr_update_job_completion($order, $d);
            }
        }
    }
    return new WP_REST_Response(["received" => true], 200);
}
function eicr_verify_stripe($payload, $header, $secret)
{
    preg_match("/t=(\d+)/", $header, $tm);
    preg_match("/v1=([a-f0-9]+)/", $header, $sm);
    if (empty($tm[1]) || empty($sm[1]) || abs(time() - (int) $tm[1]) > 300) {
        return false;
    }
    return hash_equals(
        hash_hmac("sha256", $tm[1] . "." . $payload, $secret),
        $sm[1],
    );
}
function eicr_invoice_email_html($d, $paid)
{
    $o = get_option("eicr_settings", []);
    $logo = EICR_THEME_URI . "/assets/images/logo.png";
    $company =
        trim((string) ($o["legal_business_name"] ?? "")) ?: "EICR IN LONDON";
    $business_email = $o["email"] ?? get_option("admin_email");
    $business_address =
        $o["address"] ??
        "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS";
    $phone = $o["phone"] ?? "+44 7878 655350";
    $invoice = $d["invoice_number"] ?? $d["reference"];
    $payment_status = $paid ? "PAID" : "PAYMENT PENDING";
    $payment_names = [
        "stripe" => "Debit/Credit Card",
        "bank" => "Bank Transfer",
        "cash" => "Cash to Engineer",
    ];
    $payment =
        $payment_names[$d["payment_method"] ?? ""] ??
        ucwords((string) ($d["payment_method"] ?? ""));
    $items = (array) ($d["service_items"] ?? []);
    if (!$items) {
        foreach (
            (array) ($d["services"] ?? [
                $d["service"] ?? "Property compliance service",
            ])
            as $name
        ) {
            $items[] = ["name" => $name, "price" => null];
        }
    }
    $rows = "";
    foreach ($items as $item) {
        $price =
            array_key_exists("price", $item) && $item["price"] !== null
                ? "&pound;" . number_format((float) $item["price"], 2)
                : "-";
        $rows .=
            '<tr><td style="padding:11px 8px;border-bottom:1px solid #d1d5db">' .
            esc_html($item["name"]) .
            '</td><td style="padding:11px 8px;border-bottom:1px solid #d1d5db;text-align:right;font-weight:700">' .
            $price .
            "</td></tr>";
    }
    $rows .=
        '<tr><td style="padding:10px 8px;border-bottom:1px solid #d1d5db">Parking charge</td><td style="padding:10px 8px;border-bottom:1px solid #d1d5db;text-align:right">&pound;' .
        number_format((float) ($d["parking_charge"] ?? 0), 2) .
        '</td></tr><tr><td style="padding:10px 8px;border-bottom:1px solid #d1d5db">Congestion charge</td><td style="padding:10px 8px;border-bottom:1px solid #d1d5db;text-align:right">&pound;' .
        number_format((float) ($d["congestion_charge"] ?? 0), 2) .
        "</td></tr>";
    $notes = trim((string) ($d["notes"] ?? ""));
    if ($notes === "") {
        $notes = "No notes were provided.";
    }
    return '<div style="margin:0;background:#eeeeee;padding:30px 10px;font-family:Arial,sans-serif;color:#111"><div style="max-width:720px;margin:auto;background:#fff;border:1px solid #111"><div style="padding:26px 30px;border-bottom:4px solid #111"><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td><img src="' .
        esc_url($logo) .
        '" alt="EICR in London" style="display:block;width:68px;height:auto"></td><td style="text-align:right"><div style="font-size:11px;color:#555">INVOICE / BOOKING REFERENCE</div><div style="margin-top:5px;font-size:15px;font-weight:800">' .
        esc_html($invoice) .
        '</div></td></tr></table></div><div style="padding:24px 30px"><table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="width:50%;vertical-align:top;padding-right:20px"><div style="font-size:11px;font-weight:800;border-bottom:1px solid #111;padding-bottom:6px">FROM</div><p style="font-size:13px;line-height:1.6;margin:9px 0"><b>' .
        esc_html($company) .
        "</b><br>" .
        esc_html($business_address) .
        "<br>" .
        esc_html($phone) .
        "<br>" .
        esc_html($business_email) .
        '</p></td><td style="width:50%;vertical-align:top;padding-left:20px"><div style="font-size:11px;font-weight:800;border-bottom:1px solid #111;padding-bottom:6px">BOOKED FOR</div><p style="font-size:13px;line-height:1.6;margin:9px 0"><b>' .
        esc_html($d["name"]) .
        "</b><br>" .
        esc_html($d["address"]) .
        "<br>" .
        esc_html($d["postcode"] ?? "") .
        "<br>" .
        esc_html($d["email"]) .
        "<br>" .
        esc_html($d["phone"]) .
        '</p></td></tr></table><div style="border:2px solid #111;padding:13px 15px;margin-bottom:20px"><table role="presentation" style="width:100%"><tr><td><b>BOOKING REQUEST RECEIVED</b><br><span style="font-size:12px">' .
        esc_html($d["date"]) .
        " | " .
        esc_html($d["time_slot"] ?? "") .
        '</span></td><td style="text-align:right"><b>' .
        $payment_status .
        '</b><br><span style="font-size:12px">' .
        esc_html($payment) .
        '</span></td></tr></table></div><table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="font-size:12px"><b>Property:</b> ' .
        esc_html($d["property_type"] ?? "") .
        '</td><td style="font-size:12px;text-align:right"><b>Issued:</b> ' .
        esc_html(current_time("d F Y")) .
        '</td></tr></table><table role="presentation" style="width:100%;border-collapse:collapse;border-top:2px solid #111"><thead><tr><th style="padding:10px 8px;text-align:left;background:#111;color:#fff">Selected services</th><th style="padding:10px 8px;text-align:right;background:#111;color:#fff">Amount</th></tr></thead><tbody>' .
        $rows .
        '</tbody><tfoot><tr><td style="padding:14px 8px;font-size:16px;font-weight:900;border-top:2px solid #111">TOTAL</td><td style="padding:14px 8px;text-align:right;font-size:20px;font-weight:900;border-top:2px solid #111">&pound;' .
        number_format((float) $d["amount"], 2) .
        '</td></tr></tfoot></table><div style="margin-top:20px;border:1px solid #111;padding:14px"><div style="font-size:11px;font-weight:800;margin-bottom:6px">NOTES FOR ENGINEER</div><div style="font-size:13px;line-height:1.6">' .
        nl2br(esc_html($notes)) .
        '</div></div><p style="font-size:12px;line-height:1.6;margin:20px 0 0">This document confirms that your booking request has been received and recorded. We will confirm the appointment after reviewing the requested scope and availability. Once confirmed, the attending specialist will contact you before travelling to the property.</p></div></div></div>';
}
function eicr_send_invoice($id, $d, $paid)
{
    $subject =
        ($paid ? "Payment receipt" : "Booking request received") .
        " - " .
        ($d["invoice_number"] ?? $d["reference"]);
    $body = eicr_invoice_email_html($d, $paid);
    $headers = ["Content-Type: text/html; charset=UTF-8"];
    $o = get_option("eicr_settings", []);
    $admin_email = sanitize_email(
        $o["invoice_email"] ?? ($o["email"] ?? get_option("admin_email")),
    );
    wp_mail($d["email"], $subject, $body, $headers);
    if ($admin_email && strtolower($admin_email) !== strtolower($d["email"])) {
        wp_mail($admin_email, $subject, $body, $headers);
    }
}
function eicr_retrieve_payment_intent($payment_intent)
{
    $payment_intent = sanitize_text_field($payment_intent);
    if (!preg_match('/^pi_[A-Za-z0-9]+$/', $payment_intent)) {
        return new WP_Error(
            "stripe_intent",
            "Invalid Stripe payment reference.",
        );
    }
    $o = get_option("eicr_settings", []);
    if (empty($o["stripe_secret"])) {
        return new WP_Error(
            "stripe_key",
            "Stripe secret key is not configured.",
        );
    }
    $r = wp_remote_get(
        "https://api.stripe.com/v1/payment_intents/" .
            rawurlencode($payment_intent),
        [
            "headers" => ["Authorization" => "Bearer " . $o["stripe_secret"]],
            "timeout" => 30,
        ],
    );
    if (is_wp_error($r)) {
        return $r;
    }
    $json = json_decode(wp_remote_retrieve_body($r), true);
    if (wp_remote_retrieve_response_code($r) !== 200 || empty($json["id"])) {
        return new WP_Error(
            "stripe_verify",
            $json["error"]["message"] ??
                "Stripe payment could not be verified.",
        );
    }
    return $json;
}
function eicr_find_payment_intent_by_reference($reference)
{
    $o = get_option("eicr_settings", []);
    if (empty($o["stripe_secret"])) {
        return new WP_Error(
            "stripe_key",
            "Stripe secret key is not configured.",
        );
    }
    $reference = preg_replace("/[^A-Z0-9-]/i", "", (string) $reference);
    if (!$reference) {
        return new WP_Error("stripe_reference", "Missing booking reference.");
    }
    $query = "metadata['reference']:'" . $reference . "'";
    $url = add_query_arg(
        ["query" => $query, "limit" => 1],
        "https://api.stripe.com/v1/payment_intents/search",
    );
    $r = wp_remote_get($url, [
        "headers" => ["Authorization" => "Bearer " . $o["stripe_secret"]],
        "timeout" => 30,
    ]);
    if (is_wp_error($r)) {
        return $r;
    }
    $json = json_decode(wp_remote_retrieve_body($r), true);
    if (wp_remote_retrieve_response_code($r) !== 200) {
        return new WP_Error(
            "stripe_search",
            $json["error"]["message"] ?? "Stripe search failed.",
        );
    }
    return $json["data"][0] ??
        new WP_Error("stripe_missing", "No matching Stripe payment was found.");
}
function eicr_mark_order_paid_from_intent($order_id, $intent)
{
    $order_id = absint($order_id);
    $d = get_post_meta($order_id, "_eicr_data", true);
    if (
        !$order_id ||
        !is_array($d) ||
        get_post_type($order_id) !== "eicr_order"
    ) {
        return new WP_Error("order", "Booking not found.");
    }
    if (($intent["status"] ?? "") !== "succeeded") {
        return new WP_Error(
            "payment",
            "Stripe has not marked this payment as successful.",
        );
    }
    if (($intent["currency"] ?? "") !== "gbp") {
        return new WP_Error(
            "payment_currency",
            "Stripe payment currency does not match this booking.",
        );
    }
    if (absint($intent["metadata"]["order_id"] ?? 0) !== $order_id) {
        return new WP_Error(
            "payment_order",
            "Stripe payment does not belong to this booking.",
        );
    }
    if (
        !hash_equals(
            (string) ($d["reference"] ?? ""),
            (string) ($intent["metadata"]["reference"] ?? ""),
        )
    ) {
        return new WP_Error(
            "payment_reference",
            "Stripe payment reference does not match this booking.",
        );
    }
    $expected = (int) round(((float) ($d["amount"] ?? 0)) * 100);
    $received = (int) ($intent["amount_received"] ?? 0);
    if ($expected < 50 || $received !== $expected) {
        return new WP_Error(
            "payment_amount",
            "Stripe payment amount does not match this booking.",
        );
    }
    $was_paid = ($d["status"] ?? "") === "Paid";
    $d["status"] = "Paid";
    $d["stripe_payment"] = $intent["id"];
    $d["stripe_payment_intent"] = $intent["id"];
    update_post_meta($order_id, "_eicr_data", $d);
    if (!$was_paid) {
        eicr_send_invoice($order_id, $d, true);
    }
    if (function_exists("eicr_update_job_completion")) {
        eicr_update_job_completion($order_id, $d);
    }
    return $d;
}
function eicr_confirm_stripe_payment()
{
    check_ajax_referer("eicr_public", "nonce");
    $order_id = absint($_POST["order_id"] ?? 0);
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user() || !function_exists("eicr_customer_can_access_order") || !eicr_customer_can_access_order($order_id)) {
        wp_send_json_error(["message" => "You are not authorised to update this booking."], 403);
    }
    $payment_intent = sanitize_text_field(
        wp_unslash($_POST["payment_intent"] ?? ""),
    );
    $intent = eicr_retrieve_payment_intent($payment_intent);
    if (is_wp_error($intent)) {
        wp_send_json_error(["message" => $intent->get_error_message()], 400);
    }
    $result = eicr_mark_order_paid_from_intent($order_id, $intent);
    if (is_wp_error($result)) {
        wp_send_json_error(["message" => $result->get_error_message()], 400);
    }
    wp_send_json_success([
        "message" => "Payment verified and booking marked Paid.",
    ]);
}
add_action(
    "wp_ajax_eicr_confirm_stripe_payment",
    "eicr_confirm_stripe_payment",
);

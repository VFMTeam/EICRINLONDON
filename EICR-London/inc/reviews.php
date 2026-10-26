<?php
if (!defined("ABSPATH")) {
    exit();
}

add_action(
    "init",
    function () {
        $settings = (array) get_option("eicr_settings", []);
        if (!array_key_exists("previous_review_count", $settings)) {
            $settings["previous_review_count"] = 98;
            update_option("eicr_settings", $settings);
        }
    },
    8,
);

function eicr_review_fields_html($context = "homepage", $selected_service = "", $allow_another = false)
{
    ob_start();
    ?>
    <form class="eicr-form eicr-review-form" data-review-context="<?php echo esc_attr($context); ?>">
        <div class="eicr-grid">
            <label>
                Service used
                <select name="service" data-modal-focus required>
                    <option value="">Choose a service</option>
                    <?php foreach (eicr_services() as $service): ?>
                        <option value="<?php echo esc_attr($service->post_title); ?>" <?php selected($selected_service, $service->post_title); ?>><?php echo esc_html($service->post_title); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <label>
                Rating
                <select name="rating" required>
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Very good</option>
                    <option value="3">3 - Good</option>
                    <option value="2">2 - Fair</option>
                    <option value="1">1 - Poor</option>
                </select>
            </label>
        </div>
        <label>
            Your review
            <textarea name="review" rows="4" maxlength="1500" required></textarea>
        </label>
        <input class="eicr-review-hp" type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <input type="hidden" name="action" value="eicr_submit_review">
        <input type="hidden" name="review_context" value="<?php echo esc_attr($context); ?>">
        <input type="hidden" name="nonce" value="<?php echo esc_attr(wp_create_nonce("eicr_public")); ?>">
        <button type="submit">Submit</button>
        <p class="eicr-response" aria-live="polite"></p>
        <?php if ($allow_another) : ?><button type="button" class="eicr-review-again">Write another review</button><?php endif; ?>
    </form>
    <?php
    return trim(ob_get_clean());
}

function eicr_review_form()
{
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user()) {
        return "";
    }

    ob_start(); ?>
    <div id="eicr-review-modal" class="eicr-review-modal" hidden>
        <div class="eicr-review-dialog" role="dialog" aria-modal="true" aria-labelledby="eicr-review-title">
            <button type="button" class="eicr-review-close" data-close-modal aria-label="Close review form">&times;</button>
            <p class="text-xs font-black uppercase tracking-widest text-amber-600">Customer feedback</p>
            <h2 id="eicr-review-title" class="mt-2 text-2xl font-black">Share your experience</h2>
            <?php echo eicr_review_fields_html("homepage", "", true); ?>
        </div>
    </div>
    <?php return ob_get_clean();
}
add_shortcode("eicr_review_form", "eicr_review_form");

function eicr_account_review_form()
{
    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user() || !eicr_customer_review_unlocked() || eicr_customer_has_submitted_review()) {
        return "";
    }
    $selected_service = (string) get_user_meta(get_current_user_id(), "_eicr_review_service", true);
    $requested_service = sanitize_text_field(wp_unslash($_GET["review_service"] ?? ""));
    $valid_services = wp_list_pluck(eicr_services(), "post_title");
    if ($requested_service && in_array($requested_service, $valid_services, true)) {
        $selected_service = $requested_service;
    }
    return '<section class="eicr-account-review-card"><div class="eicr-account-review-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p>Thank you for using our service. Please rate the service connected with your downloaded certificate.</p>' . eicr_review_fields_html("certificate", $selected_service, false) . '</section>';
}

function eicr_review_public_name($review)
{
    $name = trim((string) get_post_meta($review->ID, "_eicr_reviewer", true));
    if ($name !== "") {
        return $name;
    }

    $parts = preg_split("/\s+(?:—|-)\s+/u", get_the_title($review), 2);
    return trim((string) ($parts[0] ?? "Customer"));
}

function eicr_review_initial($name)
{
    if (function_exists("mb_substr")) {
        return mb_strtoupper(mb_substr($name, 0, 1));
    }
    return strtoupper(substr($name, 0, 1));
}

function eicr_review_card_values_html($name, $service, $rating, $content, $id, $label = "Customer review")
{
    $rating = max(1, min(5, absint($rating ?: 5)));
    $stars = str_repeat("★", $rating) . str_repeat("☆", 5 - $rating);

    ob_start();
    ?>
    <figure
        class="flex h-48 w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-white p-5 sm:w-[330px]"
        data-review-id="<?php echo esc_attr($id); ?>"
    >
        <div class="flex items-center justify-between gap-3">
            <span class="text-sm tracking-wider text-amber-500" aria-label="<?php echo esc_attr(
                $rating,
            ); ?> out of 5 stars"><?php echo esc_html($stars); ?></span>
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-700"><?php echo esc_html($label); ?></span>
        </div>
        <blockquote class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">&ldquo;<?php echo esc_html(
            $content,
        ); ?>&rdquo;</blockquote>
        <figcaption class="mt-auto flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-full bg-gold text-sm font-black text-ink"><?php echo esc_html(
                eicr_review_initial($name),
            ); ?></span>
            <span>
                <strong class="block text-sm text-ink"><?php echo esc_html(
                    $name,
                ); ?></strong>
                <small class="text-xs text-muted"><?php echo esc_html(
                    $service ?: "Customer",
                ); ?></small>
            </span>
        </figcaption>
    </figure>
    <?php return trim(ob_get_clean());
}

function eicr_review_card_html($review)
{
    return eicr_review_card_values_html(
        eicr_review_public_name($review),
        trim((string) get_post_meta($review->ID, "_eicr_service", true)),
        get_post_meta($review->ID, "_eicr_rating", true),
        trim(wp_strip_all_tags($review->post_content)),
        $review->ID,
    );
}

function eicr_reviews_section_html()
{
    $reviews = get_posts([
        "post_type" => "eicr_review",
        "post_status" => "publish",
        "posts_per_page" => -1,
        "order" => "DESC",
        "orderby" => [
            "date" => "DESC",
            "ID" => "DESC",
        ],
        "no_found_rows" => true,
        "suppress_filters" => false,
    ]);

    $counts = wp_count_posts("eicr_review");
    $total = isset($counts->publish) ? (int) $counts->publish : count($reviews);
    $cards = array_map("eicr_review_card_html", $reviews);
    $cards_html = implode("", $cards);
    $marquee_duration = max(36, min(180, count($cards) * 6));

    ob_start();
    ?>
    <section id="customer-reviews" class="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="eicr-reviews-title" data-published-review-count="<?php echo esc_attr(
        $total,
    ); ?>">
        <div class="mx-auto max-w-2xl text-center">
            <p class="font-black uppercase tracking-widest text-amber-600">Feedback from our London customers</p>
            <h2 id="eicr-reviews-title" class="mt-2 text-3xl font-black sm:text-4xl">Recent customer experiences</h2>
            <?php if ($total > 0) : ?>
                <p class="mt-3 font-bold text-slate-600">
                    <span class="text-amber-600"><?php echo esc_html(number_format_i18n($total)); ?></span>
                    <?php echo esc_html(_n("current published review", "current published reviews", $total, "eicr-in-london")); ?>
                </p>
            <?php endif; ?>
        </div>

        <?php if ($cards): ?>
            <div class="mt-8">
                <?php if (count($cards) < 4): ?>
                    <div class="flex flex-wrap justify-center gap-4" data-review-order="newest-first" data-review-count="<?php echo esc_attr(count($cards)); ?>"><?php echo $cards_html;
                    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    ?></div>
                <?php else: ?>
                    <div class="eicr-review-viewport overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                        <div class="review-marquee flex w-max gap-4" data-review-order="newest-first" data-review-count="<?php echo esc_attr(count($cards)); ?>" style="--eicr-review-duration: <?php echo esc_attr($marquee_duration); ?>s;">
                            <div class="review-marquee-set flex gap-4"><?php echo $cards_html;
                            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                            ?></div>
                            <div aria-hidden="true" class="review-marquee-set flex gap-4"><?php echo $cards_html;
                            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                            ?></div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="mt-5 text-center">
            <?php if (function_exists("eicr_is_verified_customer_user") && eicr_is_verified_customer_user()) : ?>
                <button type="button" data-open-review class="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
                    Add your review
                </button>
            <?php else : ?>
                <a href="<?php echo esc_url(function_exists("eicr_customer_sign_in_url") ? eicr_customer_sign_in_url() : home_url("/sign-in/")); ?>" class="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
                    Add your review
                </a>
            <?php endif; ?>
        </div>
    </section>
    <?php return trim(ob_get_clean());
}

function eicr_replace_static_reviews($html)
{
    $placeholder = "__EICR_DYNAMIC_REVIEWS__";
    return str_replace($placeholder, eicr_reviews_section_html(), $html);
}

add_action("wp_ajax_nopriv_eicr_submit_review", "eicr_submit_review");
add_action("wp_ajax_eicr_submit_review", "eicr_submit_review");
function eicr_submit_review()
{
    check_ajax_referer("eicr_public", "nonce");

    if (!function_exists("eicr_is_verified_customer_user") || !eicr_is_verified_customer_user()) {
        wp_send_json_error(
            ["message" => "Please sign in to submit a review."],
            403,
        );
    }

    eicr_public_rate_limit("review", 4, 10 * MINUTE_IN_SECONDS);

    if (!empty($_POST["company_website"])) {
        wp_send_json_success([
            "message" => "Thank you. Your feedback has been received.",
            "suppressed" => true,
        ]);
    }

    $customer = wp_get_current_user();
    $context = sanitize_key(wp_unslash($_POST["review_context"] ?? "homepage"));
    if (!in_array($context, ["homepage", "certificate"], true)) {
        $context = "homepage";
    }
    if ($context === "certificate" && (!function_exists("eicr_customer_review_unlocked") || !eicr_customer_review_unlocked($customer->ID) || eicr_customer_has_submitted_review($customer->ID))) {
        wp_send_json_error(["message" => "This review request is no longer available."], 403);
    }
    $name = sanitize_text_field(trim((string) $customer->display_name));
    if ($name === "") {
        $name = sanitize_text_field(trim((string) $customer->user_login));
    }
    $service = sanitize_text_field(wp_unslash($_POST["service"] ?? ""));
    $rating = absint($_POST["rating"] ?? 0);
    $review = sanitize_textarea_field(wp_unslash($_POST["review"] ?? ""));
    $valid_services = function_exists("eicr_services") ? wp_list_pluck(eicr_services(), "post_title") : [];

    if (!$name || !$service || !$review || !in_array($rating, [1, 2, 3, 4, 5], true) || !$valid_services || !in_array($service, $valid_services, true)) {
        wp_send_json_error(
            [
                "message" =>
                    "Please choose a service, select a rating and write your review.",
            ],
            400,
        );
    }
    if (
        strlen($name) > 80 ||
        strlen($service) > 180 ||
        strlen($review) > 1500
    ) {
        wp_send_json_error(
            ["message" => "One or more review fields are too long."],
            400,
        );
    }

    $id = wp_insert_post([
        "post_type" => "eicr_review",
        "post_status" => "pending",
        "post_title" => $name . " — " . $service,
        "post_content" => $review,
    ]);
    if (!$id || is_wp_error($id)) {
        wp_send_json_error(
            ["message" => "The review could not be saved. Please try again."],
            500,
        );
    }

    update_post_meta($id, "_eicr_reviewer", $name);
    update_post_meta($id, "_eicr_service", $service);
    update_post_meta($id, "_eicr_rating", $rating);
    update_post_meta($id, "_eicr_reviewer_user_id", (int) $customer->ID);
    update_post_meta(
        $id,
        "_eicr_review_consent_time",
        current_time("mysql", true),
    );
    update_user_meta($customer->ID, "_eicr_has_submitted_review", "1");
    update_user_meta($customer->ID, "_eicr_last_review_submitted_at", current_time("mysql", true));

    wp_send_json_success([
        "message" =>
            "Thank you for your review! We truly appreciate your feedback and look forward to welcoming you back whenever you need our services again.",
        "suppressed" => false,
    ]);
}

add_action(
    "transition_post_status",
    function ($new_status, $old_status, $post) {
        if (
            !$post ||
            $post->post_type !== "eicr_review" ||
            $new_status === $old_status
        ) {
            return;
        }

        clean_post_cache($post->ID);
        if (function_exists("w3tc_flush_url")) {
            w3tc_flush_url(home_url("/"));
        }
        if (function_exists("rocket_clean_home")) {
            rocket_clean_home();
        }
    },
    10,
    3,
);

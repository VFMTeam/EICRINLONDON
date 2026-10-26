<?php
if (!defined("ABSPATH")) {
    exit();
}
define("EICR_THEME_VERSION", "4.9.7");
define("EICR_THEME_DIR", get_template_directory());
define("EICR_THEME_URI", get_template_directory_uri());
require_once EICR_THEME_DIR . "/inc/setup.php";
require_once EICR_THEME_DIR . "/inc/public-security.php";
require_once EICR_THEME_DIR . "/inc/pricing-admin.php";
require_once EICR_THEME_DIR . "/inc/admin.php";
require_once EICR_THEME_DIR . "/inc/order-admin.php";
require_once EICR_THEME_DIR . "/inc/commerce.php";
require_once EICR_THEME_DIR . "/inc/customer-portal.php";
require_once EICR_THEME_DIR . "/inc/staff-portal.php";

require_once EICR_THEME_DIR . "/inc/booking-v2.php";
require_once EICR_THEME_DIR . "/inc/reviews.php";
require_once EICR_THEME_DIR . "/inc/service-catalog.php";
require_once EICR_THEME_DIR . "/inc/service-media.php";
require_once EICR_THEME_DIR . "/inc/core-pages.php";
require_once EICR_THEME_DIR . "/inc/seo.php";
require_once EICR_THEME_DIR . "/inc/payment-security.php";
require_once EICR_THEME_DIR . "/inc/smtp.php";
require_once EICR_THEME_DIR . "/inc/utf8-repair.php";

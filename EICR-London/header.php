<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo("charset"); ?>">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php
wp_body_open();
echo '<a class="eicr-skip-link" href="#main-content">Skip to main content</a>';
$eicr_header = eicr_template_html("header-content.html");
if (function_exists("eicr_customer_header_link")) {
    $eicr_account_link = eicr_customer_header_link();
    $eicr_header = str_replace(
        '</nav><button aria-label="Toggle menu"',
        $eicr_account_link . '</nav><button aria-label="Toggle menu"',
        $eicr_header,
    );
}
echo $eicr_header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
?>
<main id="main-content">

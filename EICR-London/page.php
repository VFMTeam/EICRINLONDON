<?php
get_header();
$eicr_is_customer_auth_page = is_page(["sign-in", "create-account", "reset-password"]);
$eicr_is_customer_account_page = is_page("my-account");
?>
<section class="core-page-shell<?php echo $eicr_is_customer_auth_page ? " core-page-auth-shell" : ($eicr_is_customer_account_page ? " core-page-account-shell" : ""); ?>">
    <div class="core-page-wrap">
        <?php while (have_posts()) : the_post(); ?>
            <?php if (!$eicr_is_customer_auth_page && !$eicr_is_customer_account_page) : ?>
                <header class="core-page-header">
                    <p>Property compliance in London</p>
                    <h1><?php the_title(); ?></h1>
                </header>
            <?php else : ?>
                <h1 class="eicr-visually-hidden"><?php the_title(); ?></h1>
            <?php endif; ?>
            <div class="core-page-content"><?php the_content(); ?></div>
        <?php endwhile; ?>
    </div>
</section>
<?php get_footer(); ?>

<?php
get_header();

$homepage_html = eicr_template_html('home-content.html');
if (function_exists('eicr_replace_static_reviews')) {
    $homepage_html = eicr_replace_static_reviews($homepage_html);
}
echo $homepage_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
?>
<section class="home-coverage-section" aria-labelledby="home-coverage-title">
    <div class="home-coverage-wrap">
        <div class="home-coverage-copy">
            <p class="home-coverage-kicker">London-based property safety support</p>
            <h2 id="home-coverage-title">Appointments across Greater London and selected M25 locations</h2>
            <p>
                EICR in London arranges electrical, gas, fire-safety, energy and property-assessment work for homes, rented properties and commercial premises.
                Our Dagenham base supports bookings throughout the capital, subject to the service, access and engineer availability.
            </p>
            <p>
                Customers can combine suitable checks in one request, helping landlords, homeowners, agents and property managers coordinate access and receive organised digital records.
            </p>
        </div>
        <div class="home-coverage-areas">
            <h3>Areas our team regularly supports</h3>
            <div class="home-area-groups">
                <p><b>Central London:</b> Westminster, Camden, City of London, Islington and Southwark</p>
                <p><b>North London:</b> Barnet, Enfield, Haringey, Harrow and Brent</p>
                <p><b>East London:</b> Hackney, Tower Hamlets, Newham, Greenwich, Barking and Dagenham</p>
                <p><b>South London:</b> Lambeth, Lewisham, Croydon, Bromley and Wandsworth</p>
                <p><b>West London:</b> Ealing, Hammersmith, Hillingdon, Richmond and Kingston</p>
                <p><b>Beyond London:</b> selected addresses near the M25, confirmed when the booking is reviewed</p>
            </div>
        </div>
    </div>
</section>
<?php
echo do_shortcode('[eicr_review_form]');
get_footer();

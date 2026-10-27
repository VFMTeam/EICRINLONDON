import { site, telHref } from "@/lib/site";

export default function MobileContactBar() {
  return (
    <nav className="mobile-contact-bar" aria-label="Contact us">
      <a href={telHref}>Call</a>
      <a href={`https://wa.me/${site.whatsapp}`}>WhatsApp</a>
      <a className="primary" href="/booking/" data-conversion="booking_click">Book now</a>
    </nav>
  );
}

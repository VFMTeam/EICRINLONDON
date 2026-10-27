export default function MobileContactBar({ telHref, whatsapp }: { telHref: string; whatsapp: string }) {
  return (
    <nav className="mobile-contact-bar" aria-label="Contact us">
      <a href={telHref}>Call</a>
      <a href={`https://wa.me/${whatsapp}`}>WhatsApp</a>
      <a className="primary" href="/booking/" data-conversion="booking_click">Book now</a>
    </nav>
  );
}

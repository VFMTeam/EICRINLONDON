import type { Metadata } from "next";
import BookingWizard from "@/components/BookingWizard";
import { paymentMode } from "@/lib/booking";
import { pricedServices } from "@/lib/pricing";
import { getService } from "@/lib/services";
import { bookableDates } from "@/lib/slots";
import { site, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Book Online | EICR in London" },
  description: "Book an EICR, gas safety certificate, EPC, fire risk assessment or PAT test online across London.",
  alternates: { canonical: "/booking/" },
};

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const { service } = await searchParams;
  const slug = service === "boiler-gas-safety-combo" ? "gas-safety:with-boiler-service" : typeof service === "string" ? service : undefined;
  const dates = bookableDates();
  const quoteOnly = slug && !pricedServices.some((s) => s.slug === slug.split(":")[0]) ? getService(slug) : undefined;

  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>Property compliance in London</p>
            <h1>Book Online</h1>
          </header>
          <p className="core-page-intro">
            See your price and book in two steps. Prefer to talk? <a href={telHref}>Call {site.phone}</a> (24/7 call out) or{" "}
            <a href={`https://wa.me/${site.whatsapp}`}>message us on WhatsApp</a>.
          </p>
          {quoteOnly && (
            <p className="bk-quote-only">
              {quoteOnly.title} is priced by quote. <a href={`/request-a-quote/?service=${quoteOnly.slug}`}>Request a free quote</a> or book another service below.
            </p>
          )}
          <BookingWizard minDate={dates[0]} maxDate={dates[dates.length - 1]} initialService={slug} mode={paymentMode()} />
        </div>
      </section>
    </main>
  );
}

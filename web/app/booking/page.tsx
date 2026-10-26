import type { Metadata } from "next";
import BookingWizard from "@/components/BookingWizard";
import { pricedServices } from "@/lib/pricing";
import { getService } from "@/lib/services";
import { bookableDates } from "@/lib/slots";
import { site, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Book Online | EICR in London" },
  description: "Book an EICR, gas safety, EPC, fire safety or other property compliance appointment online. See your price, pick a time and pay securely.",
  alternates: { canonical: "/booking/" },
};

// Online booking: price, appointment slot and payment. Links such as
// /booking/?service=epc open with that service chosen.
export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const { service } = await searchParams;
  const slug = typeof service === "string" ? service : undefined;
  const quoteOnly = slug && !pricedServices.some((s) => s.slug === slug) ? getService(slug) : undefined;

  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>Property compliance in London</p>
            <h1>Book Online</h1>
          </header>
          <p className="core-page-intro">
            See your price, pick a time that suits you and pay securely. Prefer to talk? <a href={telHref}>Call {site.phone}</a> or{" "}
            <a href={`https://wa.me/${site.whatsapp}`}>message us on WhatsApp</a>.
          </p>
          {quoteOnly && (
            <p className="bk-quote-only">
              {quoteOnly.title} is priced after a quick look at the job. <a href={`/request-a-quote/?service=${quoteOnly.slug}`}>Request a free quote</a>, or book one of the services below.
            </p>
          )}
          <BookingWizard dates={bookableDates()} initialService={slug} demo={!process.env.STRIPE_SECRET_KEY} />
        </div>
      </section>
    </main>
  );
}

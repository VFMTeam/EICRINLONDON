import type { Metadata } from "next";
import BookingWizard from "@/components/BookingWizard";
import { paymentMode } from "@/lib/booking";
import { BOOKING_SERVICES } from "@/lib/pricing";
import { getService } from "@/lib/services";
import { getSettings } from "@/lib/settings";
import { bookableDates } from "@/lib/slots";

export const metadata: Metadata = {
  title: { absolute: "Book Online | EICR in London" },
  description: "Book an EICR, gas safety certificate, EPC, fire risk assessment or PAT test online across London.",
  alternates: { canonical: "/booking/" },
};

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const { service } = await searchParams;
  const slug = typeof service === "string" ? service : undefined;
  const dates = bookableDates();
  const bookable = Object.values(BOOKING_SERVICES).some((list) => list.some(([s]) => s === slug));
  const quoteOnly = slug && !bookable ? getService(slug) : undefined;

  return (
    <main id="main-content">
      {quoteOnly && (
        <p className="bk-quote-only mx-auto mt-6 max-w-7xl">
          {quoteOnly.title} is priced by quote. <a href={`/request-a-quote/?service=${quoteOnly.slug}`}>Request a free quote</a> or book another service below.
        </p>
      )}
      <BookingWizard minDate={dates[0]} maxDate={dates[dates.length - 1]} initialService={slug} mode={paymentMode()} settings={await getSettings()} />
    </main>
  );
}

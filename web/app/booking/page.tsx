import type { Metadata } from "next";
import { quoteFormHtml } from "@/lib/quoteForm";
import { site, telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Book an Appointment | EICR in London" },
  description: "Book an EICR, gas safety, EPC, fire safety or other property compliance appointment anywhere in London.",
  alternates: { canonical: "/booking/" },
};

// Booking request page. It reuses the quote form (public/js/main.js sends it)
// and picks the service from links such as /booking/?service=epc.
export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const { service } = await searchParams;
  const form = quoteFormHtml(service)
    .replace("<h1>Request a Quote</h1>", "<h1>Book an Appointment</h1>")
    .replace(">Request quote</button>", ">Send booking request</button>")
    .replace(
      "</header>",
      `</header><p class="core-page-intro">Send your details and preferred date, and we will call you to confirm the appointment and price. Prefer to talk? <a href="${telHref}">Call ${site.phone}</a> or <a href="https://wa.me/${site.whatsapp}">message us on WhatsApp</a>.</p>`,
    );

  return <main id="main-content" dangerouslySetInnerHTML={{ __html: form }} />;
}

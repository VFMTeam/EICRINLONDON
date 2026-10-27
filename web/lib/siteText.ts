import { site } from "@/lib/site";

// Home page text that can be changed in /admin/. content/pages/home.html marks
// each place with [[key]].
export type TextField = [key: string, label: string, text: string];

export const TEXT_GROUPS: { title: string; fields: TextField[] }[] = [
  {
    title: "Top of the home page",
    fields: [
      ["heroTitle", "Headline", "Inspections and Safety Reports for"],
      ["heroTitleGold", "Headline, gold part", "London Properties"],
      ["heroText", "Text under the headline", "Arrange electrical, gas, energy and fire-safety work through one London team. We match each property to the right engineer, coordinate the visit and provide clear digital paperwork when the agreed work is complete."],
    ],
  },
  {
    title: "Services and prices",
    fields: [
      ["servicesTitle", "Heading", "Choose Your Property Services"],
      ["servicesText", "Text", "Compare inspections, certificates and starting prices, then view the details or book the service your property requires. All prices include VAT."],
    ],
  },
  {
    title: "The right engineer",
    fields: [
      ["engineerTitle", "Heading", "The right engineer for each service"],
      ["engineerText", "Text", "Electrical, gas, energy, fire-safety and asbestos work require different competence and registrations. We review the requested scope before confirming the appointment and assign a suitable professional for the agreed work."],
    ],
  },
  {
    title: "Experience",
    fields: [
      ["experienceTitle", "Heading", "10+ years of London property safety work"],
      ["experienceText", "Text", "We have worked on London homes, rentals and business premises for over ten years. We know the boroughs, the parking, and what letting agents and councils expect to see on a certificate."],
    ],
  },
  {
    title: "How it works",
    fields: [
      ["processTitle", "Heading", "How It Works"],
      ["processText", "Text", "Each stage has a defined purpose, from selecting the scope to receiving the completed record."],
    ],
  },
  {
    title: "Questions",
    fields: [
      ["faqTitle", "Heading", "Before you book"],
      ["faqText", "Text", "Need help choosing a service? Contact us and we will point you to the right inspection."],
    ],
  },
  {
    title: "Book now banner",
    fields: [
      ["ctaTitle", "Heading", "Ready to arrange your inspection?"],
      ["ctaText", "Text", "Select the service you need and send your booking request today."],
    ],
  },
  {
    title: "Areas we cover",
    fields: [
      ["areasTitle", "Heading", "Appointments across Greater London and selected M25 locations"],
      ["areasText", "Text", "EICR in London arranges electrical, gas, fire-safety, energy and property-assessment work for homes, rented properties and commercial premises. We are based in Dagenham and cover every London borough."],
    ],
  },
];

export const DEFAULT_TEXT: Record<string, string> = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map(([key, , text]) => [key, text])));

export type Business = { phone: string; whatsapp: string; email: string; address: string };

export const DEFAULT_BUSINESS: Business = { phone: site.phone, whatsapp: site.whatsapp, email: site.email, address: site.address };

export type Announcement = { enabled: boolean; text: string; link: string };
export const DEFAULT_ANNOUNCEMENT: Announcement = { enabled: false, text: "", link: "/booking/" };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const telNumber = (phone: string) => phone.replace(/[^0-9+]/g, "");

// Swaps the built-in contact details in the HTML partials for the saved ones.
export function applyBusiness(html: string, b: Business) {
  const d = DEFAULT_BUSINESS;
  return html
    .replaceAll(d.phone, escape(b.phone))
    .replaceAll(telNumber(d.phone), telNumber(b.phone))
    .replaceAll(`wa.me/${d.whatsapp}`, `wa.me/${b.whatsapp}`)
    .replaceAll(d.email, escape(b.email))
    .replaceAll(d.address, escape(b.address));
}

export function applyText(html: string, text: Record<string, string>) {
  return html.replace(/\[\[(\w+)\]\]/g, (token, key: string) => (key in text ? escape(text[key]) : token));
}

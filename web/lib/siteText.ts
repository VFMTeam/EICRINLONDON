import { site } from "@/lib/site";

// Home page text that can be changed in /admin/. content/pages/home.html marks
// each place with [[key]].
export type TextField = [key: string, label: string, text: string];

export const TEXT_GROUPS: { title: string; fields: TextField[] }[] = [
  {
    title: "Top of the home page",
    fields: [
      ["heroTitle", "Headline", "EICR & Landlord Safety Certificates in"],
      ["heroTitleGold", "Headline, gold part", "London"],
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
      ["engineerText", "Text", "Electrical work is done by our NICEIC registered electricians, gas work by Gas Safe engineers, and EPCs by accredited energy assessors. We check what you need before we confirm the booking."],
    ],
  },
  {
    title: "Experience",
    fields: [
      ["experienceTitle", "Heading", "London property safety, borough by borough"],
      ["experienceText", "Text", "We work on London homes, rentals and business premises every day. We know the boroughs, the parking, and what letting agents and councils expect to see on a certificate."],
    ],
  },
  {
    title: "How it works",
    fields: [
      ["processTitle", "Heading", "How It Works"],
      ["processText", "Text", "Four steps from booking to certificate."],
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

export const SOCIAL = [
  ["facebook", "Facebook", ["facebook.com", "fb.com"], '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'],
  ["instagram", "Instagram", ["instagram.com"], '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>'],
  ["tiktok", "TikTok", ["tiktok.com"], '<path d="M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5"/>'],
] as const;
export type SocialKey = (typeof SOCIAL)[number][0];

export type Business = { phone: string; whatsapp: string; email: string; address: string } & Record<SocialKey, string>;

export const DEFAULT_BUSINESS: Business = { phone: site.phone, whatsapp: site.whatsapp, email: site.email, address: site.address, facebook: "", instagram: "", tiktok: "" };

// Keeps a social link only if it is a web address on that network's own site.
export function socialUrl(value: unknown, key: SocialKey) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const hosts = SOCIAL.find(([k]) => k === key)![2] as readonly string[];
    const ok = hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
    return ok ? `https://${url.host}${url.pathname}${url.search}`.slice(0, 300) : "";
  } catch {
    return "";
  }
}

export function socialLinksHtml(b: Business) {
  const links = SOCIAL.filter(([key]) => b[key]).map(
    ([key, label, , icon]) =>
      `<a href="${escape(b[key])}" target="_blank" rel="noopener" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></a>`,
  );
  return links.length ? `<div class="social-links">${links.join("")}</div>` : "";
}

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
    .replaceAll(d.address, escape(b.address))
    .replaceAll("<!--SOCIAL-->", socialLinksHtml(b));
}

export function applyText(html: string, text: Record<string, string>) {
  return html.replace(/\[\[(\w+)\]\]/g, (token, key: string) => (key in text ? escape(text[key]) : token));
}

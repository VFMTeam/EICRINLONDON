import { getService } from "@/lib/services";

// Booking prices follow the original site's rules (EICR-London/inc/booking-v2.php).
export type PropertyKind = "residential" | "commercial";
export type Property = { kind: PropertyKind; bedrooms: number; floors: number; commercialType: string };

export const BOOKING_SERVICES: Record<PropertyKind, [slug: string, label: string][]> = {
  residential: [
    ["eicr-certificate", "EICR – Electrical Certificate"],
    ["gas-safety", "Gas Safety Certificate"],
    ["epc", "Energy Performance Certificate"],
    ["pat-testing", "PAT Testing"],
    ["fuse-box-installation", "Fuse Box Installation & Replacement"],
    ["fire-alarm-certificate", "Fire Alarm Panel Service & Certification"],
    ["fire-risk", "Fire Risk Assessment"],
    ["fire-safety-certificate", "Fire Safety Certificate"],
    ["emergency-lighting", "Emergency Lighting Certificate"],
    ["smoke-detector-certificate", "Smoke Detector Certificate"],
    ["fire-extinguisher-check", "Fire Extinguisher Check"],
    ["asbestos-survey", "Asbestos Survey"],
    ["health-safety-service", "Health & Safety Service"],
    ["boiler-service", "Boiler Service"],
    ["boiler-gas-safety-combo", "Boiler Service + Gas Safety Certificate (2 Appliances)"],
  ],
  commercial: [
    ["commercial-eicr", "EICR – Electrical Certificate"],
    ["gas-safety", "Gas Safety Certificate"],
    ["epc", "Energy Performance Certificate"],
    ["pat-testing", "PAT Testing"],
    ["fuse-box-installation", "Fuse Box Installation & Replacement"],
    ["fire-alarm-certificate", "Fire Alarm Panel Service & Certification"],
    ["fire-risk", "Fire Risk Assessment"],
    ["fire-safety-certificate", "Fire Safety Certificate"],
    ["emergency-lighting", "Emergency Lighting Certificate"],
    ["smoke-detector-certificate", "Smoke Detector Certificate"],
    ["fire-extinguisher-check", "Fire Extinguisher Check"],
    ["asbestos-survey", "Asbestos Survey"],
    ["health-safety-service", "Health & Safety Service"],
    ["boiler-service", "Boiler Service"],
  ],
};

export const COMMERCIAL_TYPES: [id: string, label: string, factor: number][] = [
  ["pub-restaurant", "Pub/Restaurant", 1.2],
  ["shop", "Shop", 1],
  ["warehouse", "Warehouse", 1.35],
  ["office", "Office", 1.1],
  ["other", "Other", 1.1],
];
const COMMERCIAL_MINIMUM: Record<string, number> = { "commercial-eicr": 345, "fire-risk": 159, "asbestos-survey": 249, "fuse-box-installation": 350 };

export const PARKING: [id: string, label: string, fee: number][] = [
  ["free", "Free parking can be provided", 0],
  ["paid", "Paid parking nearby", 5],
  ["none", "No allocated parking", 5],
];
export const CONGESTION_FEE = 18;
export const DEPOSIT = 30;

const round = (n: number) => Math.round(n * 100) / 100;

export function servicePrice(slug: string, p: Property): number | null {
  const base = getService(slug)?.price;
  if (base === undefined || !BOOKING_SERVICES[p.kind].some(([s]) => s === slug)) return null;
  if (p.kind === "commercial") {
    const factor = COMMERCIAL_TYPES.find(([id]) => id === p.commercialType)?.[2] ?? 1.1;
    return round(Math.max(base, COMMERCIAL_MINIMUM[slug] ?? base) * factor);
  }
  const b = p.bedrooms;
  if (slug === "eicr-certificate") return base + (b <= 0 ? 0 : b <= 2 ? 20 : b <= 4 ? 40 : 70);
  if (slug === "epc") return base + (b <= 3 ? 0 : b === 4 ? 10 : b === 5 ? 20 : 30);
  if (slug === "asbestos-survey") return base + (b <= 2 ? 0 : b <= 5 ? 50 : 100);
  if (slug === "fire-risk") return base + Math.max(0, p.floors - 1) * 20 + Math.max(0, b - 2) * 10;
  return base;
}

export type QuoteLine = { slug: string; title: string; price: number };
export type Quote = { lines: QuoteLine[]; parking: number; congestion: number; total: number };

// The server always prices from these rules, never from the browser.
export function quote(slugs: string[], p: Property, parking: string, congestion: boolean): Quote | null {
  const lines: QuoteLine[] = [];
  for (const slug of new Set(slugs)) {
    const price = servicePrice(slug, p);
    const title = BOOKING_SERVICES[p.kind].find(([s]) => s === slug)?.[1];
    if (price === null || !title) return null;
    lines.push({ slug, title, price });
  }
  if (!lines.length) return null;
  const parkingFee = PARKING.find(([id]) => id === parking)?.[2] ?? 0;
  const congestionFee = congestion ? CONGESTION_FEE : 0;
  return { lines, parking: parkingFee, congestion: congestionFee, total: round(lines.reduce((t, l) => t + l.price, 0) + parkingFee + congestionFee) };
}

export const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

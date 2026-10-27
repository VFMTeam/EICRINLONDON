import { services } from "@/lib/services";

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

export const COMMERCIAL_TYPES: [id: string, label: string][] = [
  ["pub-restaurant", "Pub/Restaurant"],
  ["shop", "Shop"],
  ["warehouse", "Warehouse"],
  ["office", "Office"],
  ["other", "Other"],
];
export const COMMERCIAL_MINIMUM_SERVICES = ["commercial-eicr", "fire-risk", "asbestos-survey", "fuse-box-installation"];

export const BEDROOM_PRICED = ["eicr-certificate", "epc", "asbestos-survey", "fire-risk"];

export const PARKING: [id: "free" | "paid" | "none", label: string][] = [
  ["free", "Free parking can be provided"],
  ["paid", "Paid parking nearby"],
  ["none", "No allocated parking"],
];

// Extra prices shown only in the home page price tables.
export const HOME_TABLE_PRICES: [key: string, label: string, price: number][] = [
  ["fire-safety-detector", "Fire Safety Certificate: each extra detector", 15],
  ["pat-appliance", "PAT Testing: each extra appliance", 1.5],
  ["lighting-4-6", "Emergency Lighting: four to six fittings", 79],
  ["lighting-7-12", "Emergency Lighting: seven to twelve fittings", 129],
  ["asbestos-communal-3-4", "Asbestos: communal area, three or four storeys", 279.99],
  ["asbestos-home-1-2", "Asbestos: home with up to two bedrooms", 249.99],
  ["asbestos-home-3-5", "Asbestos: home with three to five bedrooms", 299.99],
];

export type Settings = {
  prices: Record<string, number>;
  bedrooms: { eicr: number[]; epc: number[]; asbestos: number[] };
  fireRisk: { perStorey: number; perBedroom: number };
  commercial: { factors: Record<string, number>; minimums: Record<string, number> };
  fees: { paidParking: number; noParking: number; congestion: number };
  homeTable: Record<string, number>;
  offer: { enabled: boolean; two: number; threePlus: number };
};

export const BEDROOM_BANDS = {
  eicr: ["Studio", "1–2 bedrooms", "3–4 bedrooms", "5–6 bedrooms"],
  epc: ["1–3 bedrooms", "4 bedrooms", "5 bedrooms", "6 bedrooms"],
  asbestos: ["Studio to 2 bedrooms", "3–5 bedrooms", "6 bedrooms"],
};

export const DEFAULT_SETTINGS: Settings = {
  prices: Object.fromEntries(services.map((s) => [s.slug, s.price])),
  bedrooms: { eicr: [0, 20, 40, 70], epc: [0, 10, 20, 30], asbestos: [0, 50, 100] },
  fireRisk: { perStorey: 20, perBedroom: 10 },
  commercial: {
    factors: { "pub-restaurant": 1.2, shop: 1, warehouse: 1.35, office: 1.1, other: 1.1 },
    minimums: { "commercial-eicr": 345, "fire-risk": 159, "asbestos-survey": 249, "fuse-box-installation": 350 },
  },
  fees: { paidParking: 5, noParking: 5, congestion: 18 },
  homeTable: Object.fromEntries(HOME_TABLE_PRICES.map(([k, , p]) => [k, p])),
  offer: { enabled: false, two: 10, threePlus: 15 },
};

const money = (v: unknown, fallback: number, max = 100000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : fallback;
};
const record = (stored: unknown, defaults: Record<string, number>, max?: number) => {
  const s = (stored ?? {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, money(s[k], d, max)]));
};
const list = (stored: unknown, defaults: number[]) => defaults.map((d, i) => money(Array.isArray(stored) ? stored[i] : undefined, d));

// Fills any missing or invalid value with the default, so a bad save can never break pricing.
export function normaliseSettings(raw: unknown): Settings {
  const r = (raw ?? {}) as Partial<Record<keyof Settings, Record<string, unknown>>>;
  const d = DEFAULT_SETTINGS;
  return {
    prices: record(r.prices, d.prices),
    bedrooms: { eicr: list(r.bedrooms?.eicr, d.bedrooms.eicr), epc: list(r.bedrooms?.epc, d.bedrooms.epc), asbestos: list(r.bedrooms?.asbestos, d.bedrooms.asbestos) },
    fireRisk: record(r.fireRisk, d.fireRisk) as Settings["fireRisk"],
    commercial: {
      factors: record((r.commercial?.factors as unknown), d.commercial.factors, 10),
      minimums: record((r.commercial?.minimums as unknown), d.commercial.minimums),
    },
    fees: record(r.fees, d.fees) as Settings["fees"],
    homeTable: record(r.homeTable, d.homeTable),
    offer: {
      enabled: r.offer?.enabled === true,
      two: money(r.offer?.two, d.offer.two, 90),
      threePlus: money(r.offer?.threePlus, d.offer.threePlus, 90),
    },
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

export const parkingFee = (id: string, s: Settings) => (id === "paid" ? s.fees.paidParking : id === "none" ? s.fees.noParking : 0);

export function offerPercent(count: number, s: Settings) {
  if (!s.offer.enabled || count < 2) return 0;
  return count >= 3 ? s.offer.threePlus : s.offer.two;
}

export function servicePrice(slug: string, p: Property, s: Settings): number | null {
  const base = s.prices[slug];
  if (base === undefined || !BOOKING_SERVICES[p.kind].some(([slug2]) => slug2 === slug)) return null;
  if (p.kind === "commercial") {
    const factor = s.commercial.factors[p.commercialType] ?? s.commercial.factors.other;
    return round(Math.max(base, s.commercial.minimums[slug] ?? base) * factor);
  }
  const b = p.bedrooms;
  const { eicr, epc, asbestos } = s.bedrooms;
  if (slug === "eicr-certificate") return round(base + eicr[b <= 0 ? 0 : b <= 2 ? 1 : b <= 4 ? 2 : 3]);
  if (slug === "epc") return round(base + epc[b <= 3 ? 0 : b === 4 ? 1 : b === 5 ? 2 : 3]);
  if (slug === "asbestos-survey") return round(base + asbestos[b <= 2 ? 0 : b <= 5 ? 1 : 2]);
  if (slug === "fire-risk") return round(base + Math.max(0, p.floors - 1) * s.fireRisk.perStorey + Math.max(0, b - 2) * s.fireRisk.perBedroom);
  return base;
}

export type QuoteLine = { slug: string; title: string; price: number };
export type Quote = { lines: QuoteLine[]; discount: number; discountPercent: number; parking: number; congestion: number; total: number };

// The server always prices from these rules, never from the browser.
export function quote(slugs: string[], p: Property, parking: string, congestion: boolean, s: Settings): Quote | null {
  const lines: QuoteLine[] = [];
  for (const slug of new Set(slugs)) {
    const price = servicePrice(slug, p, s);
    const title = BOOKING_SERVICES[p.kind].find(([slug2]) => slug2 === slug)?.[1];
    if (price === null || !title) return null;
    lines.push({ slug, title, price });
  }
  if (!lines.length) return null;
  const subtotal = lines.reduce((t, l) => t + l.price, 0);
  const discountPercent = offerPercent(lines.length, s);
  const discount = round((subtotal * discountPercent) / 100);
  const parkingCost = parkingFee(parking, s);
  const congestionFee = congestion ? s.fees.congestion : 0;
  return { lines, discount, discountPercent, parking: parkingCost, congestion: congestionFee, total: round(subtotal - discount + parkingCost + congestionFee) };
}

export const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

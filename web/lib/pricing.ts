// Prices inc. VAT, from the home page price tables. Unlisted services are quote-only.
export type PriceOption = { id: string; label: string; price: number };
export type PricedService = {
  slug: string;
  title: string;
  options: PriceOption[];
  extra?: { label: string; included: number; each: number };
};

export const pricedServices: PricedService[] = [
  {
    slug: "eicr-certificate",
    title: "EICR – Electrical Certificate",
    options: [
      { id: "studio", label: "Studio property", price: 79 },
      { id: "1-2-bed", label: "One or two bedrooms", price: 99 },
      { id: "3-4-bed", label: "Three or four bedrooms", price: 119 },
      { id: "5-6-bed", label: "Five or six bedrooms", price: 149 },
    ],
  },
  {
    slug: "gas-safety",
    title: "Gas Safety Certificate",
    options: [
      { id: "1-2-appliances", label: "One or two gas appliances", price: 69 },
      { id: "with-boiler-service", label: "Combined visit: gas record and boiler service", price: 149 },
    ],
  },
  {
    slug: "epc",
    title: "Energy Performance Certificate",
    options: [
      { id: "1-3-bed", label: "One to three bedrooms", price: 89 },
      { id: "4-bed", label: "Four bedrooms", price: 99 },
      { id: "5-bed", label: "Five bedrooms", price: 109 },
      { id: "6-bed", label: "Six bedrooms", price: 119 },
    ],
  },
  {
    slug: "fire-risk",
    title: "Fire Risk Assessment (FRA)",
    options: [
      { id: "residential", label: "Homes and residential buildings", price: 79 },
      { id: "business", label: "Workplaces and business premises", price: 159 },
    ],
  },
  {
    slug: "fire-safety-certificate",
    title: "Fire Safety Certificate",
    options: [{ id: "standard", label: "Up to three detectors", price: 79 }],
    extra: { label: "Number of detectors", included: 3, each: 15 },
  },
  {
    slug: "pat-testing",
    title: "PAT Testing",
    options: [{ id: "standard", label: "Up to ten appliances", price: 59 }],
    extra: { label: "Number of appliances", included: 10, each: 1.5 },
  },
  {
    slug: "emergency-lighting",
    title: "Emergency Lighting Certificate",
    options: [
      { id: "1-3", label: "One to three fittings", price: 59 },
      { id: "4-6", label: "Four to six fittings", price: 79 },
      { id: "7-12", label: "Seven to twelve fittings", price: 129 },
    ],
  },
  {
    slug: "asbestos-survey",
    title: "Asbestos Survey",
    options: [
      { id: "communal-1-2", label: "Communal area, one or two storeys", price: 249 },
      { id: "communal-3-4", label: "Communal area, three or four storeys", price: 279.99 },
      { id: "home-1-2-bed", label: "Home with no more than two bedrooms", price: 249.99 },
      { id: "home-3-5-bed", label: "Home with three to five bedrooms", price: 299.99 },
    ],
  },
];

export const DEPOSIT = 30;

export type Quote = { service: PricedService; option: PriceOption; items: number; total: number };

// The server always prices from this list, never from the browser.
export function quote(slug: string, optionId: string, items = 0): Quote | null {
  const service = pricedServices.find((s) => s.slug === slug);
  const option = service?.options.find((o) => o.id === optionId);
  if (!service || !option) return null;
  const count = service.extra ? Math.min(Math.max(Math.floor(items) || service.extra.included, service.extra.included), 500) : 0;
  const extraCost = service.extra ? (count - service.extra.included) * service.extra.each : 0;
  return { service, option, items: count, total: Math.round((option.price + extraCost) * 100) / 100 };
}

export const gbp = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

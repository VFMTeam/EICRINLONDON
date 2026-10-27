import { quote, PARKING, COMMERCIAL_TYPES, type Quote, type PropertyKind } from "@/lib/pricing";
import { isBookable } from "@/lib/slots";

export type Pay = "full" | "bank" | "cash";

export type BookingInput = {
  kind: PropertyKind;
  bedrooms: number;
  floors: number;
  commercialType: string;
  services: string[];
  date: string;
  slot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  parking: string;
  congestion: boolean;
  notes?: string;
  pay: Pay;
};

export type Booking = BookingInput & { quote: Quote; payNow: number; name: string };

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
const PAYS: Pay[] = ["full", "bank", "cash"];

export const isOffline = (pay: Pay) => pay === "bank" || pay === "cash";

// Returns an error message for the customer, or the checked booking.
export function checkBooking(raw: unknown): Booking | string {
  const b = (raw ?? {}) as Record<string, unknown>;
  const text = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const num = (k: string, min: number, max: number) => Math.min(Math.max(Math.floor(Number(b[k])) || min, min), max);
  const kind: PropertyKind = b.kind === "commercial" ? "commercial" : "residential";
  const input: BookingInput = {
    kind,
    bedrooms: num("bedrooms", 0, 6),
    floors: num("floors", 1, 5),
    commercialType: COMMERCIAL_TYPES.some(([id]) => id === b.commercialType) ? String(b.commercialType) : "other",
    services: Array.isArray(b.services) ? b.services.slice(0, 20).map((s) => String(s).slice(0, 80)) : [],
    date: text("date", 10),
    slot: text("slot", 4),
    firstName: text("firstName", 60),
    lastName: text("lastName", 60),
    email: text("email", 254),
    phone: text("phone", 50),
    address: text("address", 200),
    postcode: text("postcode", 10).toUpperCase(),
    parking: PARKING.some(([id]) => id === b.parking) ? String(b.parking) : "",
    congestion: b.congestion === true,
    notes: text("notes", 1000),
    pay: PAYS.includes(b.pay as Pay) ? (b.pay as Pay) : "full",
  };
  const q = quote(input.services, input, input.parking, input.congestion);
  if (!q) return "Please select at least one service.";
  if (!isBookable(input.date, input.slot)) return "Please choose a date and arrival window.";
  if (!input.firstName || !input.lastName || !input.phone) return "Please enter your name and phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Please enter a valid email.";
  if (!input.address || !UK_POSTCODE.test(input.postcode)) return "Please enter the property address and a valid UK postcode.";
  if (!input.parking) return "Please tell us about parking at the address.";
  const payNow = isOffline(input.pay) ? 0 : q.total;
  return { ...input, services: q.lines.map((l) => l.slug), quote: q, payNow, name: `${input.firstName} ${input.lastName}` };
}

export const encodeBooking = (b: BookingInput) => {
  const { kind, bedrooms, floors, commercialType, services, date, slot, firstName, lastName, email, phone, address, postcode, parking, congestion, notes, pay } = b;
  const input: BookingInput = { kind, bedrooms, floors, commercialType, services, date, slot, firstName, lastName, email, phone, address, postcode, parking, congestion, notes, pay };
  return Buffer.from(JSON.stringify(input)).toString("base64url");
};
export function decodeBooking(s: string | undefined) {
  if (!s) return null;
  try {
    const b = checkBooking(JSON.parse(Buffer.from(s, "base64url").toString("utf8")));
    return typeof b === "string" ? null : b;
  } catch {
    return null;
  }
}

// Demo (test card 4242) until STRIPE_SECRET_KEY is set. BOOKING_REQUEST_ONLY=1 emails bookings without payment.
export type PaymentMode = "stripe" | "demo" | "request";
export function paymentMode(): PaymentMode {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return process.env.BOOKING_REQUEST_ONLY === "1" ? "request" : "demo";
}

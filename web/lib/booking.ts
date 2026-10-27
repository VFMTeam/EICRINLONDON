import { quote, DEPOSIT, type Quote } from "@/lib/pricing";
import { isBookable } from "@/lib/slots";

// An online booking as sent by the booking form (components/BookingWizard.tsx).
export type BookingInput = {
  service: string;
  option: string;
  items?: number;
  date: string;
  slot: string;
  propertyType: string;
  address: string;
  postcode: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  // deposit / full: paid online now. cash: paid to the engineer on the day.
  pay: "deposit" | "full" | "cash";
};

export type Booking = BookingInput & { quote: Quote; payNow: number };

export const PROPERTY_TYPES = ["Flat", "House", "HMO", "Commercial", "Other"];

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;

// Checks a booking and works out the price on the server. Returns an error
// message for the customer, or the checked booking.
export function checkBooking(raw: unknown): Booking | string {
  const b = (raw ?? {}) as Record<string, unknown>;
  const text = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const input: BookingInput = {
    service: text("service", 80),
    option: text("option", 40),
    items: Number(b.items) || 0,
    date: text("date", 10),
    slot: text("slot", 4),
    propertyType: text("propertyType", 20),
    address: text("address", 200),
    postcode: text("postcode", 10).toUpperCase(),
    name: text("name", 100),
    phone: text("phone", 50),
    email: text("email", 254),
    notes: text("notes", 1000),
    pay: b.pay === "full" || b.pay === "cash" ? b.pay : "deposit",
  };
  const q = quote(input.service, input.option, input.items);
  if (!q) return "Please choose a service and property size.";
  if (!isBookable(input.date, input.slot)) return "Please choose a date and time for the visit.";
  if (!PROPERTY_TYPES.includes(input.propertyType)) return "Please choose the property type.";
  if (!input.address || !UK_POSTCODE.test(input.postcode)) return "Please enter the property address and a valid UK postcode.";
  if (!input.name || !input.phone) return "Please enter your name and phone number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Please enter a valid email for your receipt.";
  const payNow = input.pay === "cash" ? 0 : input.pay === "full" ? q.total : Math.min(DEPOSIT, q.total);
  return { ...input, items: q.items, quote: q, payNow };
}

// Demo mode only: the booking travels in the URL between the demo pages.
export const encodeBooking = (b: BookingInput) => Buffer.from(JSON.stringify(b)).toString("base64url");
export function decodeBooking(s: string | undefined) {
  if (!s) return null;
  try {
    const b = checkBooking(JSON.parse(Buffer.from(s, "base64url").toString("utf8")));
    return typeof b === "string" ? null : b;
  } catch {
    return null;
  }
}

// How online bookings are paid:
// - "stripe": STRIPE_SECRET_KEY is set, customers pay by card / Apple Pay.
// - "request": BOOKING_REQUEST_ONLY=1 and no key, the booking is emailed to
//   the team, who call the customer to confirm and take payment.
// - "demo": otherwise (the site is not launched yet), a test payment page
//   (card 4242...). No money is taken.
export type PaymentMode = "stripe" | "demo" | "request";
export function paymentMode(): PaymentMode {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return process.env.BOOKING_REQUEST_ONLY === "1" ? "request" : "demo";
}

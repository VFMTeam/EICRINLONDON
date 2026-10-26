import { NextResponse } from "next/server";
import { checkBooking, encodeBooking, paymentMode, type Booking } from "@/lib/booking";
import { emailTeam } from "@/lib/email";
import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import { site } from "@/lib/site";

// Starts payment for an online booking (components/BookingWizard.tsx).
// See paymentMode() in lib/booking.ts for the three ways this works.

async function stripeCheckout(b: Booking, origin: string, key: string) {
  const description = `${b.quote.option.label}${b.quote.items ? `, ${b.quote.items} items` : ""} · ${prettyDate(b.date)}, ${slotLabel(b.slot)}`;
  const params = new URLSearchParams({
    mode: "payment",
    customer_email: b.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(Math.round(b.payNow * 100)),
    "line_items[0][price_data][product_data][name]": `${b.quote.service.title}${b.pay === "deposit" ? " (deposit)" : ""}`,
    "line_items[0][price_data][product_data][description]": description,
    success_url: `${origin}/booking/confirmed/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/?service=${b.service}`,
  });
  const meta: Record<string, string> = {
    service: b.quote.service.title, option: b.quote.option.label, items: String(b.quote.items), date: b.date, slot: b.slot,
    property_type: b.propertyType, address: b.address, postcode: b.postcode, name: b.name, phone: b.phone,
    total: String(b.quote.total), pay: b.pay, notes: b.notes ?? "",
  };
  for (const [k, v] of Object.entries(meta)) params.set(`metadata[${k}]`, v.slice(0, 500));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    console.error("Stripe rejected the checkout session", res.status, await res.text());
    return null;
  }
  return ((await res.json()) as { url: string }).url;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please complete the form and try again." }, { status: 400 });
  }
  const booking = checkBooking(body);
  if (typeof booking === "string") return NextResponse.json({ error: booking }, { status: 400 });

  const mode = paymentMode();
  if (mode === "demo") return NextResponse.json({ url: `/booking/demo-pay/?b=${encodeBooking(booking)}` });
  if (mode === "request") {
    const rows = [
      ["Name", booking.name], ["Phone", booking.phone], ["Email", booking.email],
      ["Service", `${booking.quote.service.title} – ${booking.quote.option.label}${booking.quote.items ? `, ${booking.quote.items} items` : ""}`],
      ["Price", `${gbp(booking.quote.total)} inc. VAT (not paid online)`],
      ["Visit", `${prettyDate(booking.date)}, ${slotLabel(booking.slot)}`],
      ["Property", `${booking.propertyType}, ${booking.address}, ${booking.postcode}`],
      ["Notes", booking.notes || "None"],
    ];
    const sent = await emailTeam(`Booking request: ${booking.quote.service.title} – ${booking.name}`, "New booking request", rows, booking.email);
    if (sent !== "sent") return NextResponse.json({ error: `Sorry, we could not send your booking just now. Please call ${site.phone}.` }, { status: 503 });
    return NextResponse.json({ url: `/booking/confirmed/?request=${encodeBooking(booking)}` });
  }

  const origin = new URL(request.url).origin;
  const key = process.env.STRIPE_SECRET_KEY!;

  const url = await stripeCheckout(booking, origin, key);
  if (!url) return NextResponse.json({ error: `Sorry, payment could not be started. Please call ${site.phone}.` }, { status: 502 });
  return NextResponse.json({ url });
}

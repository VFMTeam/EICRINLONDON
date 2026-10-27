import { NextResponse } from "next/server";
import { checkBooking, encodeBooking, isOffline, paymentMode, type Booking } from "@/lib/booking";
import { emailTeam } from "@/lib/email";
import { emailInvoice, invoiceNumber, packLines, quoteLines } from "@/lib/invoice";
import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import { site } from "@/lib/site";

async function stripeCheckout(b: Booking, origin: string, key: string) {
  const services = b.quote.lines.map((l) => l.title).join(" + ");
  const description = `${b.address}, ${b.postcode} · ${prettyDate(b.date)}, ${slotLabel(b.slot)}`;
  const params = new URLSearchParams({
    mode: "payment",
    customer_email: b.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(Math.round(b.payNow * 100)),
    "line_items[0][price_data][product_data][name]": services.slice(0, 250),
    "line_items[0][price_data][product_data][description]": description,
    success_url: `${origin}/booking/confirmed/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/`,
  });
  const meta: Record<string, string> = {
    services, property: b.kind === "residential" ? `${b.bedrooms} bed, ${b.floors} storey` : b.commercialType,
    date: b.date, slot: b.slot, address: b.address, postcode: b.postcode, name: b.name, phone: b.phone,
    parking: b.parking, congestion: b.congestion ? "yes" : "no", total: String(b.quote.total), pay: b.pay, notes: b.notes ?? "",
    invoice: packLines(b.quote),
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
  const offline = isOffline(booking.pay) || mode === "request";
  if (offline) {
    if (mode !== "demo") {
      const rows = [
        ["Name", booking.name], ["Phone", booking.phone], ["Email", booking.email],
        ...booking.quote.lines.map((l) => [l.title, gbp(l.price)]),
        ["Parking", booking.quote.parking ? gbp(booking.quote.parking) : "Free parking"],
        ["Congestion charge", booking.quote.congestion ? gbp(booking.quote.congestion) : "No"],
        ["Total", gbp(booking.quote.total)],
        ["Payment", booking.pay === "cash" ? "Cash to the engineer on the day" : booking.pay === "bank" ? "Bank transfer – email our bank details" : "Not paid online – call to take payment"],
        ["Visit", `${prettyDate(booking.date)}, ${slotLabel(booking.slot)}`],
        ["Property", booking.kind === "residential" ? `Residential, ${booking.bedrooms ? `${booking.bedrooms} bedrooms` : "studio"}, ${booking.floors} storey(s)` : `Commercial, ${booking.commercialType}`],
        ["Address", `${booking.address}, ${booking.postcode}`],
        ["Notes", booking.notes || "None"],
      ];
      const sent = await emailTeam(`Booking: ${booking.quote.lines.map((l) => l.title).join(", ")} – ${booking.name}`, "New booking", rows, booking.email);
      if (sent !== "sent") return NextResponse.json({ error: `Sorry, we could not send your booking just now. Please call ${site.phone}.` }, { status: 503 });
      if (isOffline(booking.pay)) {
        await emailInvoice({
          number: invoiceNumber(), name: booking.name, email: booking.email, address: `${booking.address}, ${booking.postcode}`,
          date: booking.date, slot: booking.slot, lines: quoteLines(booking.quote), total: booking.quote.total, method: booking.pay === "cash" ? "cash" : "bank",
        });
      }
    }
    return NextResponse.json({ url: `/booking/confirmed/?booked=${encodeBooking(booking)}` });
  }
  if (mode === "demo") return NextResponse.json({ url: `/booking/demo-pay/?b=${encodeBooking(booking)}` });

  const origin = new URL(request.url).origin;
  const key = process.env.STRIPE_SECRET_KEY!;

  const url = await stripeCheckout(booking, origin, key);
  if (!url) return NextResponse.json({ error: `Sorry, payment could not be started. Please call ${site.phone}.` }, { status: 502 });
  return NextResponse.json({ url });
}

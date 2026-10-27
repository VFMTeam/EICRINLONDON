import { createHmac, timingSafeEqual } from "node:crypto";
import { recordBooking } from "@/lib/bookings";
import { emailTeam } from "@/lib/email";
import { emailInvoice, invoiceNumber, unpackLines } from "@/lib/invoice";

// Stripe calls this after each Checkout payment, and the booking is emailed
// to the team. Needs STRIPE_WEBHOOK_SECRET (Stripe > Developers > Webhooks,
// endpoint https://www.eicrinlondon.co.uk/api/stripe-webhook/, event
// checkout.session.completed). See web/README.md.

type Session = {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
};

const TOLERANCE_SECONDS = 5 * 60;

// Checks the Stripe-Signature header the way Stripe's own libraries do.
function verified(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return parts.some(([k, v]) => {
    if (k !== "v1" || !v) return false;
    const given = Buffer.from(v, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const label = (key: string) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return new Response("Not configured", { status: 503 });
  }
  const payload = await request.text();
  if (!verified(payload, request.headers.get("stripe-signature"), secret)) return new Response("Bad signature", { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: Session } };
  const paidEvent = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
  const session = event.data.object;
  if (!paidEvent || session.payment_status !== "paid") return new Response("Ignored", { status: 200 });

  const meta = session.metadata ?? {};
  const email = session.customer_details?.email ?? "";
  const amount = session.amount_total != null ? `£${(session.amount_total / 100).toFixed(2)}` : "Unknown";
  const rows = [
    ["Paid online", amount],
    ["Email", email || "Not given"],
    ...Object.entries(meta).filter(([k, v]) => v && k !== "invoice").map(([k, v]) => [label(k), v]),
    ["Stripe payment", session.id],
  ];
  const what = meta.services ?? meta.service ?? "Booking";
  const sent = await emailTeam(`Paid booking: ${what} – ${meta.name ?? email}`, "New paid booking", rows, email || undefined);
  // Anything but "sent" makes Stripe retry later, so the booking isn't lost.
  if (sent !== "sent") return new Response("Email failed", { status: 500 });
  await recordBooking(
    {
      visit: meta.date ?? "", services: what.split(" + "), total: (session.amount_total ?? 0) / 100,
      method: "card", name: meta.name ?? email, postcode: meta.postcode ?? "",
    },
    session.id,
  );

  if (email && session.amount_total != null) {
    const total = session.amount_total / 100;
    const lines = unpackLines(meta.invoice ?? "");
    await emailInvoice(
      {
        number: invoiceNumber(session.id), name: meta.name ?? "", email, address: [meta.address, meta.postcode].filter(Boolean).join(", "),
        date: meta.date ?? "", slot: meta.slot ?? "", lines: lines.length ? lines : [[meta.services ?? "Booking", total]], total, method: "card",
      },
      `invoice-${session.id}`,
    );
  }
  return new Response("OK", { status: 200 });
}

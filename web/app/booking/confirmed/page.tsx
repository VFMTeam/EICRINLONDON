import type { Metadata } from "next";
import BookingSummary from "@/components/BookingSummary";
import { decodeBooking } from "@/lib/booking";
import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import { site, telHref } from "@/lib/site";

export const metadata: Metadata = { title: "Booking Confirmed", robots: { index: false } };

type Session = { payment_status: string; amount_total: number; customer_details?: { email?: string }; metadata: Record<string, string> };

async function stripeSession(id: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) return null;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  return res.ok ? ((await res.json()) as Session) : null;
}

// Shown after payment: from Stripe (session_id) or from demo mode (demo).
export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ session_id?: string; demo?: string }> }) {
  const { session_id, demo } = await searchParams;
  const session = session_id ? await stripeSession(session_id) : null;
  const booking = !process.env.STRIPE_SECRET_KEY ? decodeBooking(demo) : null;
  const ok = (session && session.payment_status === "paid") || booking;

  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>{ok ? "Payment received" : "Booking"}</p>
            <h1>{ok ? "Your booking is confirmed" : "We could not find this payment"}</h1>
          </header>
          {ok ? (
            <div className="bk-layout">
              <div className="bk-main bk-confirmed">
                <p>Thank you. We have your booking and a receipt is on its way to your email. The engineer will call you before the visit.</p>
                <p>Need to change anything? <a href={telHref}>Call {site.phone}</a> or <a href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>.</p>
                {booking && <p className="bk-demo-banner">Demo mode: no real payment was taken and no booking was sent.</p>}
              </div>
              {booking && <BookingSummary b={booking} paid />}
              {session && (
                <aside className="bk-summary">
                  <h2>Your booking</h2>
                  <dl>
                    <dt>Service</dt>
                    <dd>{session.metadata.service} · {session.metadata.option}</dd>
                    <dt>Appointment</dt>
                    <dd>{prettyDate(session.metadata.date)}, {slotLabel(session.metadata.slot)}</dd>
                  </dl>
                  <p className="bk-paynow"><span>Paid</span><b>{gbp(session.amount_total / 100)}</b></p>
                </aside>
              )}
            </div>
          ) : (
            <p className="core-page-intro">
              If you have paid, please <a href={telHref}>call {site.phone}</a> and we will check your booking.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

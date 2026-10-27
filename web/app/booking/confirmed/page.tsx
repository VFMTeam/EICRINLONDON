import type { Metadata } from "next";
import BookingSummary from "@/components/BookingSummary";
import { decodeBooking, paymentMode } from "@/lib/booking";
import { gbp } from "@/lib/pricing";
import { getSecret } from "@/lib/secrets";
import { getSettings, getSite } from "@/lib/settings";
import { prettyDate, slotLabel } from "@/lib/slots";

export const metadata: Metadata = { title: "Booking Confirmed", robots: { index: false } };

type Session = { payment_status: string; amount_total: number; customer_details?: { email?: string }; metadata: Record<string, string> };

async function stripeSession(id: string) {
  const key = await getSecret("stripeSecretKey");
  if (!key || !/^cs_[A-Za-z0-9_]+$/.test(id)) return null;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  return res.ok ? ((await res.json()) as Session) : null;
}

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ session_id?: string; demo?: string; booked?: string }> }) {
  const { session_id, demo, booked } = await searchParams;
  const mode = await paymentMode();
  const settings = await getSettings();
  const site = await getSite();
  const session = session_id ? await stripeSession(session_id) : null;
  const offline = decodeBooking(booked, settings);
  const booking = offline ?? (mode === "demo" ? decodeBooking(demo, settings) : null);
  const ok = (session && session.payment_status === "paid") || booking;

  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>{offline ? "Booking received" : ok ? "Payment received" : "Booking"}</p>
            <h1>{ok ? "Your booking is confirmed" : "We could not find this payment"}</h1>
          </header>
          {ok ? (
            <div>
              <div className="bk-main bk-confirmed">
                {offline?.pay === "cash" ? (
                  <p>Thank you. Please pay the engineer {gbp(offline.quote.total)} in cash on the day. Nothing has been charged online. We will call you to confirm the visit.</p>
                ) : offline?.pay === "bank" ? (
                  <p>Thank you. We will email you our bank details to pay {gbp(offline.quote.total)} and call you to confirm the visit.</p>
                ) : offline ? (
                  <p>We will call you shortly to confirm the appointment and take payment. Nothing has been charged yet.</p>
                ) : (
                  <p>Thank you. We have your booking and a receipt is on its way to your email. The engineer will call you before the visit.</p>
                )}
                <p>Need to change anything? <a href={site.telHref}>Call {site.phone}</a> or <a href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>.</p>
                {mode === "demo" && !offline && booking && <p className="bk-demo-banner">Demo mode: no real payment was taken and no booking was sent.</p>}
              </div>
              {booking && <BookingSummary b={booking} status={offline ? "offline" : "paid"} />}
              {session && (
                <aside className="bk-summary">
                  <h2>Your booking</h2>
                  <dl>
                    <dt>Service</dt>
                    <dd>{session.metadata.services}</dd>
                    <dt>Appointment</dt>
                    <dd>{prettyDate(session.metadata.date)}, {slotLabel(session.metadata.slot)}</dd>
                  </dl>
                  <p className="bk-paynow"><span>Paid</span><b>{gbp(session.amount_total / 100)}</b></p>
                </aside>
              )}
            </div>
          ) : (
            <p className="core-page-intro">
              If you have paid, please <a href={site.telHref}>call {site.phone}</a> and we will check your booking.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

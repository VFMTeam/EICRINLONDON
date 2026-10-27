import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DemoPayForm from "@/components/DemoPayForm";
import { decodeBooking, paymentMode } from "@/lib/booking";
import { gbp } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function DemoPayPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  if (paymentMode() !== "demo") redirect("/booking/");
  const { b } = await searchParams;
  const settings = await getSettings();
  const booking = decodeBooking(b, settings);
  if (!booking || !b) redirect("/booking/");
  const lines = [
    ...booking.quote.lines.map((l) => [l.title, l.price] as const),
    ...(booking.quote.parking ? [["Parking", booking.quote.parking] as const] : []),
    ...(booking.quote.congestion ? [["Congestion zone", booking.quote.congestion] as const] : []),
  ];

  return (
    <main id="main-content" className="sc-page">
      <section className="sc-order">
        <a className="sc-back" href="/booking/">← EICR in London <span className="sc-test">TEST MODE</span></a>
        <p className="sc-label">Pay EICR in London</p>
        <p className="sc-amount">{gbp(booking.payNow)}</p>
        <ul className="sc-lines">
          {lines.map(([name, price]) => (
            <li key={name}><span>{name}</span><span>{gbp(price)}</span></li>
          ))}
        </ul>
        <p className="sc-total"><span>Total due</span><span>{gbp(booking.payNow)}</span></p>
      </section>
      <section className="sc-pay">
        <DemoPayForm amount={gbp(booking.payNow)} booking={b} email={booking.email} name={booking.name} postcode={booking.postcode} />
        <p className="sc-powered">Powered by <b>stripe</b> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></p>
      </section>
    </main>
  );
}

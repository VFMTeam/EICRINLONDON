import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DemoPayForm from "@/components/DemoPayForm";
import { decodeBooking, paymentMode } from "@/lib/booking";
import { gbp } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { prettyDate, slotLabel } from "@/lib/slots";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

export default async function DemoPayPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  if (paymentMode() !== "demo") redirect("/booking/");
  const { b } = await searchParams;
  const settings = await getSettings();
  const booking = decodeBooking(b, settings);
  if (!booking || !b) redirect("/booking/");
  const extras = [
    ...(booking.quote.discount ? [[`Multi-service offer (${booking.quote.discountPercent}% off)`, -booking.quote.discount] as const] : []),
    ...(booking.quote.parking ? [["Parking", booking.quote.parking] as const] : []),
    ...(booking.quote.congestion ? [["Congestion zone", booking.quote.congestion] as const] : []),
  ];

  return (
    <main id="main-content" className="sc-page">
      <section className="sc-order">
        <div className="sc-order-inner">
          <a className="sc-brand" href="/booking/">
            <img src="/images/logo.png" alt="" width={44} height={36} />
            <span>EICR in London</span>
          </a>
          <p className="sc-label">Amount to pay</p>
          <p className="sc-amount">{gbp(booking.payNow)}</p>
          <ul className="sc-lines">
            {booking.quote.lines.map((l) => (
              <li key={l.slug}>
                <span className="sc-line-icon"><Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></span>
                <span className="sc-line-name">{l.title}</span>
                <span>{gbp(l.price)}</span>
              </li>
            ))}
            {extras.map(([name, price]) => (
              <li key={name} className="sc-line-extra"><span className="sc-line-name">{name}</span><span>{price < 0 ? `-${gbp(-price)}` : gbp(price)}</span></li>
            ))}
          </ul>
          <p className="sc-total"><span>Total</span><span>{gbp(booking.payNow)}</span></p>
          <div className="sc-visit">
            <p><Icon d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />{prettyDate(booking.date)}, {slotLabel(booking.slot)}</p>
            <p><Icon d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />{booking.address}, {booking.postcode}</p>
          </div>
        </div>
      </section>
      <section className="sc-pay">
        <div className="sc-pay-inner">
          <DemoPayForm amount={gbp(booking.payNow)} booking={b} email={booking.email} name={booking.name} postcode={booking.postcode} />
          <ul className="sc-trust">
            <li><Icon d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />Secure SSL encryption</li>
            <li><Icon d="M5 11h14v10H5zM8 11V7a4 4 0 118 0v4" />PCI DSS compliant</li>
            <li><Icon d="M3 7h18v10H3zM3 11h18" />Card details never stored</li>
          </ul>
          <p className="sc-powered">Powered by <b>stripe</b> · <a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></p>
        </div>
      </section>
    </main>
  );
}

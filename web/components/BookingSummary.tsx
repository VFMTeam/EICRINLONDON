import { Fragment } from "react";
import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import { isOffline, type Booking } from "@/lib/booking";

export default function BookingSummary({ b, status }: { b: Booking; status: "due" | "paid" | "offline" }) {
  return (
    <section className="bk-summary">
      <h2>Your booking</h2>
      <dl>
        {b.quote.lines.map((l) => (<Fragment key={l.slug}><dt>{l.title}</dt><dd>{gbp(l.price)}</dd></Fragment>))}
        {b.quote.parking > 0 && (<><dt>Parking</dt><dd>{gbp(b.quote.parking)}</dd></>)}
        {b.quote.congestion > 0 && (<><dt>Congestion zone</dt><dd>{gbp(b.quote.congestion)}</dd></>)}
        <dt>Address</dt>
        <dd>{b.address}, {b.postcode}</dd>
        <dt>Appointment</dt>
        <dd>{prettyDate(b.date)}, {slotLabel(b.slot)}</dd>
      </dl>
      <p className="bk-total"><span>Total</span><b>{gbp(b.quote.total)}</b></p>
      {status === "offline" || isOffline(b.pay) ? (
        <p className="bk-paynow"><span>{b.pay === "bank" ? "Pay by bank transfer" : "Pay the engineer in cash"}</span><b>{gbp(b.quote.total)}</b></p>
      ) : (
        <p className="bk-paynow"><span>{status === "paid" ? "Paid" : "Pay now"}</span><b>{gbp(b.payNow)}</b></p>
      )}
    </section>
  );
}

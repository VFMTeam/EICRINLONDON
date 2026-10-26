import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import type { Booking } from "@/lib/booking";

// Booking details shown on the payment and confirmation pages.
export default function BookingSummary({ b, paid, requested }: { b: Booking; paid?: boolean; requested?: boolean }) {
  return (
    <aside className="bk-summary">
      <h2>Your booking</h2>
      <dl>
        <dt>Service</dt>
        <dd>{b.quote.service.title}</dd>
        <dt>Property</dt>
        <dd>{b.quote.option.label}{b.quote.service.extra ? `, ${b.quote.items} items` : ""} · {b.propertyType}</dd>
        <dt>Address</dt>
        <dd>{b.address}, {b.postcode}</dd>
        <dt>Appointment</dt>
        <dd>{prettyDate(b.date)}, {slotLabel(b.slot)}</dd>
      </dl>
      <p className="bk-total"><span>Total inc. VAT</span><b>{gbp(b.quote.total)}</b></p>
      {!requested && <p className="bk-paynow"><span>{paid ? "Paid" : "Pay now"}</span><b>{gbp(b.payNow)}</b></p>}
      {!requested && b.payNow < b.quote.total && <p className="bk-note">Remaining {gbp(b.quote.total - b.payNow)} is paid after the visit.</p>}
    </aside>
  );
}

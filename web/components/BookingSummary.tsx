import { gbp } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import type { Booking } from "@/lib/booking";

export default function BookingSummary({ b, status }: { b: Booking; status: "due" | "paid" | "offline" }) {
  const rest = b.quote.total - b.payNow;
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
      {status === "offline" ? (
        <p className="bk-paynow"><span>{b.pay === "cash" ? "Pay the engineer in cash" : "To pay"}</span><b>{gbp(b.quote.total)}</b></p>
      ) : (
        <>
          <p className="bk-paynow"><span>{status === "paid" ? "Paid" : "Pay now"}</span><b>{gbp(b.payNow)}</b></p>
          {rest > 0 && <p className="bk-note">Remaining {gbp(rest)} is paid after the visit.</p>}
        </>
      )}
    </aside>
  );
}

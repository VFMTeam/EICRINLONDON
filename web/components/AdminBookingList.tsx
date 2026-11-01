import { METHODS } from "@/components/AdminBookings";
import type { BookingRecord } from "@/lib/bookings";
import { slotLabel } from "@/lib/slots";

const money = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const day = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "No date");

function jobText(b: BookingRecord, where: string) {
  return [
    `Job: ${day(b.visit)}${b.slot ? `, ${slotLabel(b.slot)}` : ""}`,
    `Customer: ${b.name}`,
    b.phone && `Phone: ${b.phone}`,
    `Address: ${where}`,
    b.property && `Property: ${b.property}`,
    `Services: ${b.services.join(", ")}`,
    b.parking && `Parking: ${b.parking}`,
    b.congestion != null && `Congestion zone: ${b.congestion ? "Yes" : "No"}`,
    `Payment: ${METHODS[b.method] ?? b.method}, ${money(b.total)}`,
    b.notes && `Notes: ${b.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function Item({ b, today }: { b: BookingRecord; today: string }) {
  const where = [b.address, b.postcode].filter(Boolean).join(", ");
  const facts = [
    ["Property", b.property],
    ["Parking", b.parking],
    ["Congestion zone", b.congestion == null ? undefined : b.congestion ? "Yes" : "No"],
    ["Payment", METHODS[b.method] ?? b.method],
  ].filter((f): f is [string, string] => Boolean(f[1]));
  return (
    <article className="adm-booking">
      <header>
        <b>{b.visit === today ? "Today" : day(b.visit)}</b>
        {b.slot && <span>{slotLabel(b.slot)}</span>}
        <strong>{money(b.total)}</strong>
      </header>
      <p className="adm-booking-who">
        <b>{b.name}</b>
        {b.phone && <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>}
        {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
      </p>
      <p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`} target="_blank" rel="noopener">{where}</a>
      </p>
      <dl className="adm-booking-facts">
        {facts.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className="adm-booking-lines">
        {(b.lines?.length ? b.lines : b.services.map((s) => [s, NaN] as [string, number])).map(([t, p], i) => (
          <div key={i}><span>{t}</span>{Number.isFinite(p) && <b>{p < 0 ? `-${money(-p)}` : money(p)}</b>}</div>
        ))}
      </div>
      {b.notes && <p className="adm-booking-notes">{b.notes}</p>}
      <a className="adm-btn ghost adm-share" href={`https://wa.me/?text=${encodeURIComponent(jobText(b, where))}`} target="_blank" rel="noopener">Send to engineer on WhatsApp</a>
    </article>
  );
}

export default function AdminBookingList({ bookings }: { bookings: BookingRecord[] }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const upcoming = bookings.filter((b) => b.visit >= today).sort((a, b) => `${a.visit}${a.slot}`.localeCompare(`${b.visit}${b.slot}`));
  const past = bookings.filter((b) => b.visit < today).sort((a, b) => b.visit.localeCompare(a.visit)).slice(0, 50);
  return (
    <div className="adm-stack">
      <section className="adm-card wide">
        <h2>Export to sheet</h2>
        <div className="adm-actions">
          <a className="adm-btn" href="/admin/export/?range=today">Today&rsquo;s visits</a>
          <a className="adm-btn ghost" href="/admin/export/?range=upcoming">Upcoming</a>
          <a className="adm-btn ghost" href="/admin/export/?range=all">All bookings</a>
        </div>
      </section>
      <section className="adm-card wide">
        <h2>Upcoming ({upcoming.length})</h2>
        {upcoming.length ? <div className="adm-bookings">{upcoming.map((b) => <Item key={b.id} b={b} today={today} />)}</div> : <p className="adm-empty">0</p>}
      </section>
      {past.length > 0 && (
        <section className="adm-card wide">
          <h2>Past</h2>
          <div className="adm-bookings">{past.map((b) => <Item key={b.id} b={b} today={today} />)}</div>
        </section>
      )}
    </div>
  );
}

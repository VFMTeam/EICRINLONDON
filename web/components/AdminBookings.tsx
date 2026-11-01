import type { BookingMethod, BookingRecord } from "@/lib/bookings";
import { slotLabel } from "@/lib/slots";

export const METHODS: Record<BookingMethod, string> = { card: "Card (paid online)", bank: "Bank transfer", cash: "Cash on the day", request: "Pay later (we call)" };

const london = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const money = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const visit = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const visitDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const monthName = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

function count<T extends string>(items: T[]) {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function Stat({ icon, label, value, note, tone }: { icon: string; label: string; value: string; note: string; tone: string }) {
  return (
    <div className="adm-stat">
      <i className={`adm-stat-icon ${tone}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={icon} /></svg></i>
      <small>{label}</small>
      <b>{value}</b>
      <span>{note}</span>
    </div>
  );
}

function Rows({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <p className="adm-empty">{empty}</p>;
  return (
    <div>
      {rows.map(([label, n]) => (
        <div key={label} className="adm-row">
          <span>{label}</span>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}

export default function AdminBookings({ bookings }: { bookings: BookingRecord[] }) {
  const today = london(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const weekStart = london(new Date(Date.UTC(y, m - 1, d - weekday, 12)));
  const monthStart = today.slice(0, 8) + "01";
  const day = (b: BookingRecord) => london(new Date(b.at));
  const week = bookings.filter((b) => day(b) >= weekStart);
  const month = bookings.filter((b) => day(b) >= monthStart);
  const total = (list: BookingRecord[]) => list.reduce((t, b) => t + b.total, 0);
  const sum = (list: BookingRecord[]) => money(total(list));
  const upcoming = bookings.filter((b) => b.visit >= today).sort((a, b) => a.visit.localeCompare(b.visit));
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(y, m - 1 - i, 15)).toISOString().slice(0, 7)).map((ym) => {
    const list = bookings.filter((b) => day(b).startsWith(ym));
    return { ym, count: list.length, value: total(list) };
  });
  const best = Math.max(1, ...months.map((x) => x.value));

  const todays = upcoming.filter((b) => b.visit === today).length;

  return (
    <>
      <Stat icon="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" label="Total earnings" value={sum(bookings)} note={`${sum(bookings.filter((b) => b.method === "card"))} paid online`} tone="green" />
      <Stat icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" label="Total orders" value={String(bookings.length)} note={`${week.length} this week`} tone="blue" />
      <Stat icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" label="This month" value={sum(month)} note={`${month.length} orders`} tone="brand" />
      <Stat icon="M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z" label="Upcoming visits" value={String(upcoming.length)} note={`${todays} today`} tone="amber" />
      <Stat icon="M3 3v18h18M7 15l4-4 3 3 5-6" label="Average order" value={money(bookings.length ? total(bookings) / bookings.length : 0)} note={`${sum(week)} this week`} tone="violet" />
      <section className="adm-card adm-half">
        <h2>Upcoming visits</h2>
        {upcoming.length ? (
          <div className="adm-table">
            {upcoming.slice(0, 8).map((b) => (
              <div key={b.id} className="adm-row">
                <span>
                  <b>{b.visit === today ? "Today" : visitDay(b.visit)}</b>{b.slot && ` · ${slotLabel(b.slot)}`} · {b.name}
                  <small>{[b.phone, [b.address, b.postcode].filter(Boolean).join(", "), b.services.join(", ")].filter(Boolean).join(" · ")}</small>
                </span>
                <b>{money(b.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-empty">0</p>
        )}
      </section>
      <section className="adm-card adm-half">
        <h2>Earnings by month</h2>
        {months.map((x) => (
          <div key={x.ym} className="adm-bar-row">
            <span>{monthName(x.ym)}</span>
            <i style={{ width: `${(x.value / best) * 100}%` }} />
            <b>{x.count} · {money(x.value)}</b>
          </div>
        ))}
      </section>
      <section className="adm-card adm-half">
        <h2>Services booked this month</h2>
        <Rows rows={count(month.flatMap((b) => b.services))} empty="0" />
      </section>
      <section className="adm-card adm-half">
        <h2>Payment method this month</h2>
        <Rows rows={count(month.map((b) => b.method)).map(([k, n]) => [METHODS[k] ?? k, n])} empty="0" />
      </section>
      <section className="adm-card wide">
        <h2>Latest bookings</h2>
        {bookings.length ? (
          <div className="adm-scroll">
            <table className="adm-tbl">
              <thead>
                <tr><th>Customer</th><th>Services</th><th>Visit</th><th>Payment</th><th>Total</th></tr>
              </thead>
              <tbody>
                {bookings.slice(0, 10).map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.name}</b><small>{[b.phone, b.postcode].filter(Boolean).join(" · ")}</small></td>
                    <td>{b.services.join(", ")}</td>
                    <td>{visit(b.visit)}<small>{b.slot ? slotLabel(b.slot) : ""}</small></td>
                    <td><span className={`adm-pill ${b.method}`}>{METHODS[b.method] ?? b.method}</span></td>
                    <td><b>{money(b.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-empty">0</p>
        )}
      </section>
    </>
  );
}

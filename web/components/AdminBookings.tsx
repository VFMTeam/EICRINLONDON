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

  return (
    <>
      <div className="adm-stat">
        <small>Total orders</small>
        <b>{bookings.length}</b>
      </div>
      <div className="adm-stat">
        <small>Total earnings</small>
        <b className="good">{sum(bookings)}</b>
      </div>
      <div className="adm-stat">
        <small>Paid online by card</small>
        <b>{sum(bookings.filter((b) => b.method === "card"))}</b>
      </div>
      <div className="adm-stat">
        <small>This month</small>
        <b>{month.length} · {sum(month)}</b>
      </div>
      <div className="adm-stat">
        <small>This week</small>
        <b>{week.length} · {sum(week)}</b>
      </div>
      <div className="adm-stat">
        <small>Average order</small>
        <b>{money(bookings.length ? total(bookings) / bookings.length : 0)}</b>
      </div>
      <div className="adm-stat">
        <small>Upcoming visits</small>
        <b className={upcoming.length ? "warn" : ""}>{upcoming.length}</b>
      </div>
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
          <div className="adm-table">
            {bookings.slice(0, 10).map((b) => (
              <div key={b.id} className="adm-row">
                <span>
                  <b>{b.name}</b> · {b.postcode}
                  <small>{[b.phone, b.services.join(", "), `visit ${visit(b.visit)}${b.slot ? `, ${slotLabel(b.slot)}` : ""}`, METHODS[b.method] ?? b.method].filter(Boolean).join(" · ")}</small>
                </span>
                <b>{money(b.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-empty">0</p>
        )}
      </section>
    </>
  );
}

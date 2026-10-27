import type { BookingMethod, BookingRecord } from "@/lib/bookings";

const METHODS: Record<BookingMethod, string> = { card: "Card (paid online)", bank: "Bank transfer", cash: "Cash on the day", request: "Pay later (we call)" };

const london = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const money = (n: number) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const visit = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

function count<T extends string>(items: T[]) {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function Rows({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (!rows.length) return <p className="adm-hint">{empty}</p>;
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

export default function AdminBookings({ bookings, gaId }: { bookings: BookingRecord[]; gaId: string }) {
  const today = london(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const weekStart = london(new Date(Date.UTC(y, m - 1, d - weekday, 12)));
  const monthStart = today.slice(0, 8) + "01";
  const day = (b: BookingRecord) => london(new Date(b.at));
  const week = bookings.filter((b) => day(b) >= weekStart);
  const month = bookings.filter((b) => day(b) >= monthStart);
  const sum = (list: BookingRecord[]) => money(list.reduce((t, b) => t + b.total, 0));

  return (
    <>
      <div className="adm-stat">
        <small>Bookings this week</small>
        <b>{week.length}</b>
      </div>
      <div className="adm-stat">
        <small>Value this week</small>
        <b>{sum(week)}</b>
      </div>
      <div className="adm-stat">
        <small>Bookings this month</small>
        <b>{month.length}</b>
      </div>
      <div className="adm-stat">
        <small>Value this month</small>
        <b>{sum(month)}</b>
      </div>
      <section className="adm-card adm-half">
        <h2>Services booked this month</h2>
        <Rows rows={count(month.flatMap((b) => b.services))} empty="No bookings yet this month." />
      </section>
      <section className="adm-card adm-half">
        <h2>Payment method this month</h2>
        <Rows rows={count(month.map((b) => b.method)).map(([k, n]) => [METHODS[k] ?? k, n])} empty="No bookings yet this month." />
      </section>
      <section className="adm-card">
        <h2>Latest bookings</h2>
        {bookings.length ? (
          <div className="adm-table">
            {bookings.slice(0, 10).map((b) => (
              <div key={b.id} className="adm-row">
                <span>
                  <b>{b.name}</b> · {b.postcode}
                  <small>{b.services.join(", ")} · visit {visit(b.visit)} · {METHODS[b.method] ?? b.method}</small>
                </span>
                <b>{money(b.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-hint">Bookings made on the website will show here.</p>
        )}
      </section>
      <section className="adm-card">
        <h2>Visitors</h2>
        <p className="adm-hint">
          {gaId
            ? `Visitor numbers, where people come from and which pages they read are in Google Analytics (${gaId}).`
            : "Add your Google Analytics Measurement ID in Contact details to start counting visitors."}
        </p>
        <p className="adm-cta">
          <a className="adm-btn" href="https://analytics.google.com/" target="_blank" rel="noopener">Open Google Analytics</a>
        </p>
      </section>
    </>
  );
}

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
  const sum = (list: BookingRecord[]) => money(list.reduce((t, b) => t + b.total, 0));

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
                  <small>{b.services.join(", ")} · visit {visit(b.visit)} · {METHODS[b.method] ?? b.method}</small>
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

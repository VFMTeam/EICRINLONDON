"use client";

import { useState } from "react";
import { pricedServices, quote, gbp, DEPOSIT } from "@/lib/pricing";
import { SLOTS, prettyDate } from "@/lib/slots";
import { PROPERTY_TYPES, type PaymentMode } from "@/lib/booking";

// Online booking in three steps: service and price, date and time, then
// details and payment. The server re-checks the price (app/api/checkout).
export default function BookingWizard({ dates, initialService, mode }: { dates: string[]; initialService?: string; mode: PaymentMode }) {
  // initialService is a slug, optionally with an option: "gas-safety:with-boiler-service".
  const [startSlug, startOption] = (initialService ?? "").split(":");
  const start = pricedServices.find((s) => s.slug === startSlug) ?? pricedServices[0];
  const [step, setStep] = useState(1);
  const [service, setService] = useState(start.slug);
  const [option, setOption] = useState(start.options.find((o) => o.id === startOption)?.id ?? start.options[0].id);
  const [items, setItems] = useState(start.extra?.included ?? 0);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ propertyType: "", address: "", postcode: "", name: "", phone: "", email: "", notes: "" });
  const [pay, setPay] = useState<"deposit" | "full" | "cash">(mode === "request" ? "cash" : "deposit");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const svc = pricedServices.find((s) => s.slug === service)!;
  const q = quote(service, option, items);
  const total = q?.total ?? 0;
  const deposit = Math.min(DEPOSIT, total);
  const payNow = pay === "cash" ? 0 : pay === "full" ? total : deposit;
  const payOptions = [
    { id: "deposit", icon: "£", title: "Pay a deposit now", text: `Secure your visit with ${gbp(deposit)}. Pay the remaining ${gbp(total - deposit)} after the visit.`, amount: gbp(deposit), online: true },
    { id: "full", icon: "✓", title: "Pay in full now", text: "Nothing more to pay on the day.", amount: gbp(total), online: true },
    { id: "cash", icon: "🤝", title: "Pay cash on the day", text: "Pay the engineer when they arrive. Nothing to pay now.", amount: gbp(total), online: false },
  ] as const;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function chooseService(slug: string) {
    const s = pricedServices.find((x) => x.slug === slug)!;
    setService(slug);
    setOption(s.options[0].id);
    setItems(s.extra?.included ?? 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, option, items, date, slot, pay, ...form }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Please try again.");
    } catch {
      setError("Connection problem. Please try again.");
    }
    setSending(false);
  }

  return (
    <div className="bk">
      <ol className="bk-steps" aria-label="Booking steps">
        {["Service", "Date & time", "Details & payment"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "is-current" : step > i + 1 ? "is-done" : ""}>
            <b>{i + 1}</b> {label}
          </li>
        ))}
      </ol>

      <div className="bk-layout">
        <div className="bk-main">
          {step === 1 && (
            <section>
              <h2>Choose your service</h2>
              <label className="bk-field">
                Service
                <select value={service} onChange={(e) => chooseService(e.target.value)}>
                  {pricedServices.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.title}</option>
                  ))}
                </select>
              </label>
              <fieldset className="bk-options">
                <legend>Property size</legend>
                {svc.options.map((o) => (
                  <label key={o.id} className={option === o.id ? "is-selected" : ""}>
                    <input type="radio" name="option" value={o.id} checked={option === o.id} onChange={() => setOption(o.id)} />
                    <span>{o.label}</span>
                    <b>{gbp(o.price)}</b>
                  </label>
                ))}
              </fieldset>
              {svc.extra && (
                <label className="bk-field">
                  {svc.extra.label} ({gbp(svc.extra.each)} each after {svc.extra.included})
                  <input type="number" min={svc.extra.included} max={500} value={items || svc.extra.included} onChange={(e) => setItems(Number(e.target.value))} />
                </label>
              )}
              <p className="bk-note">
                Need something else? <a href="/request-a-quote/">Request a quote</a> for other services.
              </p>
              <button type="button" className="bk-next" onClick={() => setStep(2)}>Choose a date</button>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>Pick a date and time</h2>
              <div className="bk-days" role="group" aria-label="Date">
                {dates.map((d) => {
                  const dt = new Date(`${d}T12:00:00Z`);
                  return (
                    <button
                      type="button"
                      key={d}
                      aria-pressed={date === d}
                      className={date === d ? "is-selected" : ""}
                      onClick={() => setDate(d)}
                    >
                      <small>{dt.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</small>
                      <b>{dt.getUTCDate()}</b>
                      <small>{dt.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</small>
                    </button>
                  );
                })}
              </div>
              {date && (
                <div className="bk-slots">
                  {SLOTS.map((s) => (
                    <button type="button" key={s.id} aria-pressed={slot === s.id} className={slot === s.id ? "is-selected" : ""} onClick={() => setSlot(s.id)}>
                      <b>{s.label}</b>
                      <span>{s.time}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="bk-nav">
                <button type="button" className="bk-back" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="bk-next" disabled={!slot} onClick={() => setStep(3)}>Continue</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <form onSubmit={submit}>
              <h2>Your details</h2>
              <div className="bk-grid">
                <label className="bk-field">Full name *<input required autoComplete="name" value={form.name} onChange={set("name")} /></label>
                <label className="bk-field">Phone *<input required type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
                <label className="bk-field">Email (for your receipt) *<input required type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
                <label className="bk-field">
                  Property type *
                  <select required value={form.propertyType} onChange={set("propertyType")}>
                    <option value="">Select</option>
                    {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="bk-field">Property address *<input required autoComplete="street-address" value={form.address} onChange={set("address")} /></label>
                <label className="bk-field">Postcode *<input required autoComplete="postal-code" value={form.postcode} onChange={set("postcode")} /></label>
              </div>
              <label className="bk-field">Notes for the engineer (access, other services needed)<textarea rows={3} value={form.notes} onChange={set("notes")} /></label>

              <h2 className="bk-subhead">Payment</h2>
              <fieldset className="bk-paycards">
                <legend className="bk-sr">How would you like to pay?</legend>
                {payOptions.filter((o) => mode !== "request" || !o.online).map((o) => (
                  <label key={o.id} className={pay === o.id ? "is-selected" : ""}>
                    <input type="radio" name="pay" value={o.id} checked={pay === o.id} onChange={() => setPay(o.id)} />
                    <span className="bk-payicon" aria-hidden="true">{o.icon}</span>
                    <span className="bk-paytext">
                      <b>{o.title}</b>
                      <small>{o.text}</small>
                    </span>
                    <span className="bk-payamount">
                      {o.amount}
                      <small>{o.online ? "now" : "on the day"}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              {pay !== "cash" && <p className="bk-secure">🔒 Secure payment by card, Apple Pay or Google Pay on the next screen.</p>}

              {error && <p className="bk-error" role="alert">{error}</p>}
              <div className="bk-nav">
                <button type="button" className="bk-back" onClick={() => setStep(2)}>Back</button>
                <button type="submit" className="bk-next" disabled={sending}>{sending ? "Please wait…" : pay === "cash" ? "Confirm booking" : `Continue to pay ${gbp(payNow)}`}</button>
              </div>
              {mode === "demo" && pay !== "cash" && <p className="bk-note">Demo mode: no real payment is taken.</p>}
            </form>
          )}
        </div>

        <aside className="bk-summary" aria-label="Booking summary">
          <h2>Your booking</h2>
          <dl>
            <dt>Service</dt>
            <dd>{svc.title}</dd>
            <dt>Property</dt>
            <dd>{q?.option.label}{svc.extra ? `, ${q?.items} items` : ""}</dd>
            {date && (<><dt>Date</dt><dd>{prettyDate(date)}</dd></>)}
            {slot && (<><dt>Time</dt><dd>{SLOTS.find((s) => s.id === slot)?.label} ({SLOTS.find((s) => s.id === slot)?.time})</dd></>)}
          </dl>
          <p className="bk-total"><span>Total inc. VAT</span><b>{gbp(total)}</b></p>
          {step === 3 && (
            <p className="bk-paynow">
              <span>{pay === "cash" ? "Pay on the day (cash)" : "Pay now"}</span>
              <b>{gbp(pay === "cash" ? total : payNow)}</b>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

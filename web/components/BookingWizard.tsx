"use client";

import { useState } from "react";
import { pricedServices, quote, gbp, DEPOSIT } from "@/lib/pricing";
import { SLOTS, prettyDate } from "@/lib/slots";
import { PROPERTY_TYPES, type PaymentMode } from "@/lib/booking";

type Pay = "deposit" | "full" | "cash";

// initialService is a slug, optionally with an option: "gas-safety:with-boiler-service".
export default function BookingWizard({ minDate, maxDate, initialService, mode }: { minDate: string; maxDate: string; initialService?: string; mode: PaymentMode }) {
  const [startSlug, startOption] = (initialService ?? "").split(":");
  const start = pricedServices.find((s) => s.slug === startSlug) ?? pricedServices[0];
  const [step, setStep] = useState(1);
  const [service, setService] = useState(start.slug);
  const [option, setOption] = useState(start.options.find((o) => o.id === startOption)?.id ?? start.options[0].id);
  const [items, setItems] = useState(start.extra?.included ?? 0);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<string>(SLOTS[0].id);
  const [form, setForm] = useState({ propertyType: "", address: "", postcode: "", name: "", phone: "", email: "", notes: "" });
  const [pay, setPay] = useState<Pay>(mode === "request" ? "cash" : "deposit");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const svc = pricedServices.find((s) => s.slug === service)!;
  const q = quote(service, option, items);
  const total = q?.total ?? 0;
  const deposit = Math.min(DEPOSIT, total);
  const payNow = pay === "cash" ? 0 : pay === "full" ? total : deposit;
  const payOptions: { id: Pay; title: string; text: string; amount: number }[] = [
    { id: "deposit", title: "Deposit now", text: `Rest (${gbp(total - deposit)}) on the day, cash or payment link`, amount: deposit },
    { id: "full", title: "Pay in full now", text: "Card, Apple Pay or Google Pay", amount: total },
    { id: "cash", title: "Cash on the day", text: "Pay the engineer at the visit", amount: total },
  ];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function chooseService(slug: string) {
    const s = pricedServices.find((x) => x.slug === slug)!;
    setService(slug);
    setOption(s.options[0].id);
    setItems(s.extra?.included ?? 0);
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        {["Service & date", "Your details"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "is-current" : step > i + 1 ? "is-done" : ""}>
            <b>{i + 1}</b> {label}
          </li>
        ))}
      </ol>

      <div className="bk-layout">
        <div className="bk-main">
          {step === 1 && (
            <form onSubmit={next}>
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
              <div className="bk-grid">
                <label className="bk-field">
                  Preferred date
                  <input type="date" required min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="bk-field">
                  Time
                  <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                    {SLOTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label} ({s.time})</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="bk-note">
                Other services? <a href="/request-a-quote/">Request a quote</a>.
              </p>
              <div className="bk-nav bk-nav-end">
                <button type="submit" className="bk-next">Continue</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submit}>
              <div className="bk-grid">
                <label className="bk-field">Full name *<input required autoComplete="name" value={form.name} onChange={set("name")} /></label>
                <label className="bk-field">Phone *<input required type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
                <label className="bk-field">Email *<input required type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
                <label className="bk-field">
                  Property type *
                  <select required value={form.propertyType} onChange={set("propertyType")}>
                    <option value="">Select</option>
                    {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="bk-field">Address *<input required autoComplete="street-address" value={form.address} onChange={set("address")} /></label>
                <label className="bk-field">Postcode *<input required autoComplete="postal-code" value={form.postcode} onChange={set("postcode")} /></label>
              </div>
              <label className="bk-field">Notes (access, parking, other services)<textarea rows={2} value={form.notes} onChange={set("notes")} /></label>

              <fieldset className="bk-paycards">
                <legend>Payment</legend>
                {payOptions.filter((o) => mode !== "request" || o.id === "cash").map((o) => (
                  <label key={o.id} className={pay === o.id ? "is-selected" : ""}>
                    <input type="radio" name="pay" value={o.id} checked={pay === o.id} onChange={() => setPay(o.id)} />
                    <span className="bk-paytext">
                      <b>{o.title}</b>
                      <small>{o.text}</small>
                    </span>
                    <span className="bk-payamount">{gbp(o.amount)}</span>
                  </label>
                ))}
              </fieldset>

              {error && <p className="bk-error" role="alert">{error}</p>}
              <div className="bk-nav">
                <button type="button" className="bk-back" onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="bk-next" disabled={sending}>
                  {sending ? "Please wait…" : pay === "cash" ? "Confirm booking" : `Pay ${gbp(payNow)}`}
                </button>
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
            {date && (<><dt>Visit</dt><dd>{prettyDate(date)}, {SLOTS.find((s) => s.id === slot)?.label.toLowerCase()}</dd></>)}
          </dl>
          <p className="bk-total"><span>Total inc. VAT</span><b>{gbp(total)}</b></p>
          {step === 2 && (
            <p className="bk-paynow">
              <span>{pay === "cash" ? "Pay on the day" : "Pay now"}</span>
              <b>{gbp(pay === "cash" ? total : payNow)}</b>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

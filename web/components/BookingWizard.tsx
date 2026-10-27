"use client";

import { useState } from "react";
import { BEDROOM_PRICED, BOOKING_SERVICES, COMMERCIAL_TYPES, PARKING, gbp, parkingFee, quote, servicePrice, type PropertyKind, type Settings } from "@/lib/pricing";
import { SLOTS } from "@/lib/slots";
import type { Pay, PaymentMode } from "@/lib/booking";

const icons = {
  bank: <path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M12 3l9 5H3l9-5Z" />,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M7 9H6v1m11-1h1v1M7 15H6v-1m11 1h1v-1" /></>,
};
const methodLabel = { bank: "Bank Transfer", card: "Debit/Credit Card", cash: "Cash to Engineer" };

export default function BookingWizard({ minDate, maxDate, initialService, mode, settings }: { minDate: string; maxDate: string; initialService?: string; mode: PaymentMode; settings: Settings }) {
  const [part, setPart] = useState(1);
  const [kind, setKind] = useState<PropertyKind>(initialService === "commercial-eicr" ? "commercial" : "residential");
  const [bedrooms, setBedrooms] = useState(0);
  const [floors, setFloors] = useState(1);
  const [commercialType, setCommercialType] = useState("pub-restaurant");
  const [picked, setPicked] = useState<Record<PropertyKind, string[]>>(() => {
    const has = (k: PropertyKind) => BOOKING_SERVICES[k].some(([slug]) => slug === initialService);
    const quoteOnly = initialService && !has("residential") && !has("commercial");
    return {
      residential: has("residential") ? [initialService!] : quoteOnly ? [] : ["eicr-certificate"],
      commercial: has("commercial") ? [initialService!] : quoteOnly ? [] : ["commercial-eicr"],
    };
  });
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<string>(SLOTS[0].id);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "", postcode: "", notes: "" });
  const [parking, setParking] = useState("");
  const [congestion, setCongestion] = useState<boolean | null>(null);
  const [method, setMethod] = useState<"bank" | "card" | "cash" | "">("");
  const [cardPay, setCardPay] = useState<"deposit" | "full">("deposit");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const property = { kind, bedrooms, floors, commercialType };
  const services = picked[kind];
  const showBedrooms = kind === "residential" && services.some((s) => BEDROOM_PRICED.includes(s));
  const showFloors = kind === "residential" && services.includes("fire-risk");
  const q = quote(services, property, parking, congestion === true, settings);
  const total = q?.total ?? 0;
  const pay: Pay = method === "card" ? cardPay : method || "cash";
  const payNow = method === "card" ? (cardPay === "full" ? total : Math.min(settings.fees.deposit, total)) : 0;
  const methods = (["bank", "card", "cash"] as const).filter((m) => mode !== "request" || m !== "card");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  function toggle(slug: string) {
    setPicked({ ...picked, [kind]: services.includes(slug) ? services.filter((s) => s !== slug) : [...services, slug] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (part === 1) {
      if (!services.length) return setMessage("Select at least one service.");
      setMessage("");
      setPart(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setMessage("");
    setSending(true);
    try {
      const res = await fetch("/api/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...property, services, date, slot, parking, congestion: congestion === true, pay, ...form }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.error ?? "Please try again.");
    } catch {
      setMessage("Connection problem. Please try again.");
    }
    setSending(false);
  }

  return (
    <div className="booking-compact bg-gradient-to-b from-amber-50 via-mist to-white px-3 py-6 sm:px-4">
      <form onSubmit={submit} className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,.35)]">
        <header className="relative overflow-hidden bg-ink p-5 text-white sm:p-6">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-gold/10"></div>
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[.2em] text-gold">London inspection request</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{part === 1 ? "Build your property booking" : "Your details and payment"}</h1>
          </div>
        </header>
        <div className="p-4 sm:p-5">
          {part === 1 && (
            <div data-part="1">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label>
                  <span className="label">Booking for</span>
                  <select className="field" value={kind} onChange={(e) => setKind(e.target.value as PropertyKind)}>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </label>
                {showBedrooms && (
                  <label>
                    <span className="label">Bedroom count</span>
                    <select className="field" value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))}>
                      <option value={0}>Studio Flat</option>
                      {[1, 2, 3, 4, 5, 6].map((i) => <option key={i} value={i}>{i} Bedroom{i > 1 ? "s" : ""}</option>)}
                    </select>
                  </label>
                )}
                {showFloors && (
                  <label>
                    <span className="label">Number of storeys</span>
                    <select className="field" value={floors} onChange={(e) => setFloors(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5].map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </label>
                )}
                {kind === "commercial" && (
                  <label>
                    <span className="label">Commercial premises category</span>
                    <select className="field" value={commercialType} onChange={(e) => setCommercialType(e.target.value)}>
                      {COMMERCIAL_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <section data-service-set={kind} className="mt-5">
                <p className="text-sm font-bold text-muted">Available checks for this {kind} property</p>
                {settings.offer.enabled && (
                  <p className="booking-offer">Offer: {settings.offer.two}% off 2 services, {settings.offer.threePlus}% off 3 or more</p>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {BOOKING_SERVICES[kind].map(([slug, label]) => (
                    <label key={slug} className="service-option flex cursor-pointer gap-2 rounded-xl border border-line bg-white p-2.5">
                      <input type="checkbox" checked={services.includes(slug)} onChange={() => toggle(slug)} />
                      <span className="min-w-0">
                        <b className="block text-xs leading-4 sm:text-sm sm:leading-5">{label}</b>
                        <small className="text-xs font-semibold">From {gbp(servicePrice(slug, property, settings) ?? 0)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="mt-5 rounded-2xl border border-line bg-white p-4">
                <h2 className="text-lg font-black">Preferred visit</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">Preferred date</span>
                    <input className="field" type="date" min={minDate} max={maxDate} value={date} onChange={(e) => setDate(e.target.value)} required />
                  </label>
                  <label>
                    <span className="label">Arrival window</span>
                    <select className="field" value={slot} onChange={(e) => setSlot(e.target.value)}>
                      {SLOTS.map((s) => <option key={s.id} value={s.id}>{s.time}</option>)}
                    </select>
                  </label>
                </div>
              </section>
            </div>
          )}

          {part === 2 && (
            <div data-part="2" className="grid gap-4">
              <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <h2 className="text-lg font-black">Who should we contact?</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className="label">First Name</span><input className="field" value={form.firstName} onChange={set("firstName")} autoComplete="given-name" required /></label>
                  <label><span className="label">Last Name</span><input className="field" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" required /></label>
                  <label><span className="label">Email</span><input className="field" type="email" value={form.email} onChange={set("email")} autoComplete="email" required /></label>
                  <label><span className="label">Phone</span><input className="field" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" required /></label>
                </div>
              </section>
              <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <h2 className="text-lg font-black">Where is the work required?</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label><span className="label">Street Address</span><input className="field" value={form.address} onChange={set("address")} autoComplete="street-address" required /></label>
                  <label><span className="label">Post Code</span><input className="field" value={form.postcode} onChange={set("postcode")} autoComplete="postal-code" required /></label>
                  <fieldset>
                    <legend className="label">Parking at the address</legend>
                    <div className="grid gap-2">
                      {PARKING.map(([id, label]) => (
                        <label key={id} className="booking-radio">
                          <input type="radio" name="parking" checked={parking === id} onChange={() => setParking(id)} required />
                          <span>{label}{parkingFee(id, settings) ? ` – add ${gbp(parkingFee(id, settings))}` : ""}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="label">London congestion charge</legend>
                    <div className="grid gap-2">
                      <label className="booking-radio"><input type="radio" name="congestion" checked={congestion === false} onChange={() => setCongestion(false)} required /><span>No</span></label>
                      <label className="booking-radio"><input type="radio" name="congestion" checked={congestion === true} onChange={() => setCongestion(true)} /><span>Yes – {gbp(settings.fees.congestion)}</span></label>
                    </div>
                  </fieldset>
                </div>
              </section>
              <section className="grid overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[1.35fr_.65fr]">
                <div className="p-4 text-slate-900 sm:p-5">
                  <h2 className="font-black text-slate-950">Your requested work</h2>
                  <div className="mt-3 grid gap-2">
                    {q?.lines.map((l) => <div key={l.slug} className="flex justify-between border-b pb-2"><span>{l.title}</span><b>{gbp(l.price)}</b></div>)}
                    {q && q.discount > 0 && <div className="flex justify-between border-b pb-2 text-emerald-700"><span>Multi-service offer ({q.discountPercent}% off)</span><b>-{gbp(q.discount)}</b></div>}
                    {q && q.parking > 0 && <div className="flex justify-between border-b pb-2"><span>Parking</span><b>{gbp(q.parking)}</b></div>}
                    {q && q.congestion > 0 && <div className="flex justify-between border-b pb-2"><span>Congestion zone</span><b>{gbp(q.congestion)}</b></div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3 text-lg">
                    <b>Total</b>
                    <b className="text-amber-600">{gbp(total)}</b>
                  </div>
                </div>
                <div className="border-t border-line bg-white p-4 sm:p-5 lg:border-l lg:border-t-0">
                  <label><span className="label">Notes For Engineer</span><textarea className="field" rows={5} value={form.notes} onChange={set("notes")} /></label>
                </div>
              </section>
              <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <h2 className="text-lg font-black">How would you like to pay?</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {methods.map((m) => (
                    <label key={m} className="booking-radio payment-choice">
                      <input type="radio" name="payment_method" checked={method === m} onChange={() => setMethod(m)} required />
                      <span className="payment-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{icons[m]}</svg></span>
                      <b>{methodLabel[m]}</b>
                    </label>
                  ))}
                </div>
                {method === "card" && (
                  <div className="stripe-card-panel">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="booking-radio">
                        <input type="radio" name="card_pay" checked={cardPay === "deposit"} onChange={() => setCardPay("deposit")} />
                        <span>Pay {gbp(Math.min(settings.fees.deposit, total))} deposit now, the rest on the day</span>
                      </label>
                      <label className="booking-radio">
                        <input type="radio" name="card_pay" checked={cardPay === "full"} onChange={() => setCardPay("full")} />
                        <span>Pay the full {gbp(total)} now</span>
                      </label>
                    </div>
                    {mode === "demo" && <p className="stripe-setup-note mt-3">Demo mode: no real payment is taken.</p>}
                  </div>
                )}
                {method === "bank" && <p className="stripe-setup-note mt-3">We will email you our bank details to pay {gbp(total)}.</p>}
                {method === "cash" && <p className="stripe-setup-note mt-3">Pay the engineer {gbp(total)} in cash on the day.</p>}
              </section>
              <label className="booking-terms-consent">
                <input type="checkbox" required />
                <span>I agree to the <a href="/terms/" target="_blank" rel="noopener">Terms &amp; Conditions</a> and acknowledge the <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span>
              </label>
            </div>
          )}

          <p className="mt-4 font-bold" aria-live="polite">{message}</p>
          <div className="booking-form-actions mt-5 flex items-center justify-between gap-4 border-t border-line pt-6">
            {part === 1 ? (
              <>
                <span className="text-xs font-semibold text-muted">{services.length} selected · {gbp(total)}</span>
                <button type="submit" className="rounded-xl bg-gold px-5 py-2.5 text-sm font-black">Continue</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPart(1)} className="rounded-xl border border-line px-5 py-2.5 text-sm font-black">Back</button>
                <button type="submit" disabled={sending} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-black text-white">
                  {sending ? "Please wait…" : method === "card" ? `Pay ${gbp(payNow)}` : "Submit"}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

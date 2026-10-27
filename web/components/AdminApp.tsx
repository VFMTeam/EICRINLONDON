"use client";

import { useState, useTransition } from "react";
import { logout, save } from "@/app/admin/actions";
import { BEDROOM_BANDS, COMMERCIAL_TYPES, DEFAULT_SETTINGS, HOME_TABLE_PRICES, type Settings } from "@/lib/pricing";
import { getService, services } from "@/lib/services";
import { TEXT_GROUPS } from "@/lib/siteText";

const TABS = [
  ["overview", "Overview", "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"],
  ["prices", "Prices", "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01"],
  ["offers", "Offers & banner", "M19 5L5 19M7 7h.01M17 17h.01M9 7a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z"],
  ["text", "Website text", "M4 6h16M4 12h16M4 18h10"],
  ["contact", "Contact details", "M3 5a2 2 0 012-2h2l2 5-2.5 1.5a11 11 0 006 6L14 13l5 2v2a2 2 0 01-2 2A16 16 0 013 5z"],
  ["reviews", "Reviews", "M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17.2 6.5 20l1-6.1L3 9.5l6.3-.9L12 3z"],
] as const;
type Tab = (typeof TABS)[number][0];

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

function Money({ label, value, onChange, unit = "£", step = "0.01" }: { label: string; value: number; onChange: (n: number) => void; unit?: string; step?: string }) {
  return (
    <label className="adm-row">
      <span>{label}</span>
      <span className="adm-num">
        <i>{unit}</i>
        <input type="number" min="0" step={step} value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.valueAsNumber)} />
      </span>
    </label>
  );
}

function Words({ label, value, fallback, onChange, long }: { label: string; value: string; fallback?: string; onChange: (t: string) => void; long?: boolean }) {
  return (
    <label className="adm-text">
      <span>
        {label}
        {fallback !== undefined && value !== fallback && (
          <button type="button" onClick={() => onChange(fallback)}>Reset</button>
        )}
      </span>
      {long ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="adm-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden="true" />
      <b>{label}</b>
    </label>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {hint && <p className="adm-hint">{hint}</p>}
      {children}
    </section>
  );
}

export default function AdminApp({ initial, canSave, pendingReviews, reviews }: { initial: Settings; canSave: boolean; pendingReviews: number; reviews: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const update = (change: (draft: Settings) => void) => {
    setS((prev) => {
      const next = structuredClone(prev);
      change(next);
      return next;
    });
    setStatus(null);
  };

  function submit() {
    startSaving(async () => {
      const result = await save(s);
      if (result.ok) setSaved(s);
      setStatus(result);
    });
  }

  const title = TABS.find(([id]) => id === tab)![1];

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <a className="adm-brand" href="/" target="_blank" rel="noopener">
          <img src="/images/logo.png" alt="" width={40} height={34} />
          <span>EICR in London<small>Admin</small></span>
        </a>
        <nav>
          {TABS.map(([id, label, d]) => (
            <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              <Icon d={d} />
              {label}
              {id === "reviews" && pendingReviews > 0 && <em>{pendingReviews}</em>}
            </button>
          ))}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener">View website</a>
          <form action={logout}><button type="submit">Log out</button></form>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <h1>{title}</h1>
        </header>
        {!canSave && <p className="adm-alert">Saving is off until a Blob store is connected in Vercel, Storage.</p>}

        {tab === "overview" && (
          <div className="adm-grid">
            <button type="button" className="adm-stat" onClick={() => setTab("offers")}>
              <small>Multi-service offer</small>
              <b className={s.offer.enabled ? "good" : ""}>{s.offer.enabled ? `On · ${s.offer.two}% / ${s.offer.threePlus}%` : "Off"}</b>
            </button>
            <button type="button" className="adm-stat" onClick={() => setTab("reviews")}>
              <small>Reviews waiting</small>
              <b className={pendingReviews ? "warn" : ""}>{pendingReviews}</b>
            </button>
            <button type="button" className="adm-stat" onClick={() => setTab("offers")}>
              <small>Top banner</small>
              <b className={s.announcement.enabled ? "good" : ""}>{s.announcement.enabled ? "Showing" : "Hidden"}</b>
            </button>
            <button type="button" className="adm-stat" onClick={() => setTab("prices")}>
              <small>EICR from</small>
              <b>£{s.prices["eicr-certificate"]}</b>
            </button>
            <Card title="What you can change here">
              <ul className="adm-list">
                <li><b>Prices</b> for every service, bedroom extras, parking and congestion fees.</li>
                <li><b>Offers & banner</b>: the multi-service discount and a message bar at the top of every page.</li>
                <li><b>Website text</b>: headings and text on the home page.</li>
                <li><b>Contact details</b>: phone, WhatsApp, email and address everywhere on the site.</li>
                <li><b>Reviews</b>: approve or remove customer reviews.</li>
              </ul>
              <p className="adm-hint">Press Save after a change. The website updates straight away.</p>
            </Card>
          </div>
        )}

        {tab === "prices" && (
          <div className="adm-stack">
            <Card title="Service prices" hint="Starting price inc. VAT, used on every page and in booking.">
              <div className="adm-cols">
                {services.map((svc) => (
                  <Money key={svc.slug} label={svc.title} value={s.prices[svc.slug]} onChange={(n) => update((d) => void (d.prices[svc.slug] = n))} />
                ))}
              </div>
            </Card>
            <Card title="Extra by property size" hint="Added to the starting price for homes.">
              <div className="adm-cols">
                {(["eicr", "epc", "asbestos"] as const).map((k) => (
                  <div key={k}>
                    <h3>{k === "eicr" ? "EICR" : k === "epc" ? "EPC" : "Asbestos Survey"}</h3>
                    {BEDROOM_BANDS[k].map((band, i) => (
                      <Money key={band} label={band} value={s.bedrooms[k][i]} onChange={(n) => update((d) => void (d.bedrooms[k][i] = n))} />
                    ))}
                  </div>
                ))}
                <div>
                  <h3>Fire Risk Assessment</h3>
                  <Money label="Each storey after the first" value={s.fireRisk.perStorey} onChange={(n) => update((d) => void (d.fireRisk.perStorey = n))} />
                  <Money label="Each bedroom after the second" value={s.fireRisk.perBedroom} onChange={(n) => update((d) => void (d.fireRisk.perBedroom = n))} />
                </div>
              </div>
            </Card>
            <Card title="Booking fees">
              <div className="adm-cols">
                <Money label="Paid parking nearby" value={s.fees.paidParking} onChange={(n) => update((d) => void (d.fees.paidParking = n))} />
                <Money label="No allocated parking" value={s.fees.noParking} onChange={(n) => update((d) => void (d.fees.noParking = n))} />
                <Money label="Congestion charge" value={s.fees.congestion} onChange={(n) => update((d) => void (d.fees.congestion = n))} />
              </div>
            </Card>
            <Card title="Commercial properties" hint="Prices are multiplied by the premises type, e.g. 1.2 adds 20%.">
              <div className="adm-cols">
                <div>
                  {COMMERCIAL_TYPES.map(([id, label]) => (
                    <Money key={id} label={label} unit="×" value={s.commercial.factors[id]} onChange={(n) => update((d) => void (d.commercial.factors[id] = n))} />
                  ))}
                </div>
                <div>
                  <h3>Lowest commercial price</h3>
                  {Object.keys(s.commercial.minimums).map((slug) => (
                    <Money key={slug} label={getService(slug)?.title ?? slug} value={s.commercial.minimums[slug]} onChange={(n) => update((d) => void (d.commercial.minimums[slug] = n))} />
                  ))}
                </div>
              </div>
            </Card>
            <Card title="Other home page prices">
              <div className="adm-cols">
                {HOME_TABLE_PRICES.map(([key, label]) => (
                  <Money key={key} label={label} value={s.homeTable[key]} onChange={(n) => update((d) => void (d.homeTable[key] = n))} />
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "offers" && (
          <div className="adm-stack">
            <Card title="Multi-service offer" hint="A discount when a customer books more than one service. It shows on the booking form and in the total.">
              <Toggle label="Offer is on" checked={s.offer.enabled} onChange={(on) => update((d) => void (d.offer.enabled = on))} />
              <div className="adm-cols">
                <Money label="2 services" unit="% off" step="1" value={s.offer.two} onChange={(n) => update((d) => void (d.offer.two = n))} />
                <Money label="3 or more services" unit="% off" step="1" value={s.offer.threePlus} onChange={(n) => update((d) => void (d.offer.threePlus = n))} />
              </div>
            </Card>
            <Card title="Top banner" hint="A short message across the top of every page, e.g. a seasonal offer.">
              <Toggle label="Show the banner" checked={s.announcement.enabled} onChange={(on) => update((d) => void (d.announcement.enabled = on))} />
              <Words label="Message" value={s.announcement.text} onChange={(t) => update((d) => void (d.announcement.text = t))} />
              <Words label="Opens this page when clicked" value={s.announcement.link} onChange={(t) => update((d) => void (d.announcement.link = t))} />
              {s.announcement.enabled && s.announcement.text && <p className="adm-preview">{s.announcement.text}</p>}
            </Card>
          </div>
        )}

        {tab === "text" && (
          <div className="adm-stack">
            {TEXT_GROUPS.map((g) => (
              <Card key={g.title} title={g.title}>
                {g.fields.map(([key, label, text]) => (
                  <Words key={key} label={label} value={s.text[key]} fallback={text} long={text.length > 70} onChange={(t) => update((d) => void (d.text[key] = t))} />
                ))}
              </Card>
            ))}
          </div>
        )}

        {tab === "contact" && (
          <div className="adm-stack">
            <Card title="Contact details" hint="Shown in the header, footer, contact page, buttons and Google business data.">
              <Words label="Phone" value={s.business.phone} fallback={DEFAULT_SETTINGS.business.phone} onChange={(t) => update((d) => void (d.business.phone = t))} />
              <Words label="WhatsApp number (country code, numbers only)" value={s.business.whatsapp} fallback={DEFAULT_SETTINGS.business.whatsapp} onChange={(t) => update((d) => void (d.business.whatsapp = t))} />
              <Words label="Email" value={s.business.email} fallback={DEFAULT_SETTINGS.business.email} onChange={(t) => update((d) => void (d.business.email = t))} />
              <Words label="Address" value={s.business.address} fallback={DEFAULT_SETTINGS.business.address} onChange={(t) => update((d) => void (d.business.address = t))} />
            </Card>
          </div>
        )}

        {tab === "reviews" && reviews}

        {tab !== "overview" && tab !== "reviews" && (
          <div className={`adm-bar${dirty ? " dirty" : ""}`}>
            <p className={status?.ok === false ? "bad" : ""} aria-live="polite">{status?.message ?? (dirty ? "You have unsaved changes." : "All changes saved.")}</p>
            <button type="button" onClick={submit} disabled={saving || !canSave || !dirty}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

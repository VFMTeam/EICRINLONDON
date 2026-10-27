"use client";

import { useState, useTransition } from "react";
import { logout, save } from "@/app/admin/actions";
import { BEDROOM_BANDS, COMMERCIAL_TYPES, DEFAULT_SETTINGS, HOME_TABLE_PRICES, gbp, quote, type Settings } from "@/lib/pricing";
import type { SecretName, SecretStatus } from "@/lib/secrets";
import { getService, services } from "@/lib/services";
import { SOCIAL, TEXT_GROUPS } from "@/lib/siteText";

const TABS = [
  ["overview", "Overview", "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"],
  ["prices", "Prices", "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01"],
  ["offers", "Offers & banner", "M19 5L5 19M7 7h.01M17 17h.01M9 7a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z"],
  ["text", "Website text", "M4 6h16M4 12h16M4 18h10"],
  ["contact", "Contact details", "M3 5a2 2 0 012-2h2l2 5-2.5 1.5a11 11 0 006 6L14 13l5 2v2a2 2 0 01-2 2A16 16 0 013 5z"],
  ["reviews", "Reviews", "M12 3l2.7 5.6 6.3.9-4.5 4.4 1 6.1L12 17.2 6.5 20l1-6.1L3 9.5l6.3-.9L12 3z"],
  ["settings", "Settings", "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"],
] as const;

const KEY_LABELS: Record<SecretName, string> = { stripeSecretKey: "Secret key (sk_live_…)", stripeWebhookSecret: "Webhook signing secret (whsec_…)", resendApiKey: "Resend API key (re_…)" };
const home0 = { kind: "residential" as const, bedrooms: 0, floors: 1, commercialType: "other" };
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

function Words({ label, value, fallback, onChange, long, placeholder }: { label: string; value: string; fallback?: string; onChange: (t: string) => void; long?: boolean; placeholder?: string }) {
  return (
    <label className="adm-text">
      <span>
        {label}
        {fallback !== undefined && value !== fallback && (
          <button type="button" onClick={() => onChange(fallback)}>Reset</button>
        )}
      </span>
      {long ? <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
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

function Card({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={wide ? "adm-card wide" : "adm-card"}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Key({ name, status, value, onChange }: { name: SecretName; status: SecretStatus[SecretName]; value: string; onChange: (t: string) => void }) {
  return (
    <label className="adm-text">
      <span>
        {KEY_LABELS[name]}
        <em className={status.source ? "on" : ""}>{status.source === "admin" ? `set ${status.hint}` : status.source === "vercel" ? `vercel ${status.hint}` : "not set"}</em>
      </span>
      <input type="password" autoComplete="off" value={value} placeholder={status.source ? "Paste a new key to replace" : "Paste key"} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Example({ slugs, s }: { slugs: string[]; s: Settings }) {
  const q = quote(slugs, home0, "", false, s);
  if (!q) return null;
  const before = q.lines.reduce((t, l) => t + l.price, 0);
  return (
    <div className="adm-row">
      <span>{q.lines.map((l) => l.title.split(" – ")[0]).join(" + ")}</span>
      <b>{q.discount > 0 && <s>{gbp(before)}</s>} {gbp(q.total)}</b>
    </div>
  );
}

export default function AdminApp({ initial, canSave, pendingReviews, reviews, bookings, keys: initialKeys, webhookUrl }: { initial: Settings; canSave: boolean; pendingReviews: number; reviews: React.ReactNode; bookings: React.ReactNode; keys: SecretStatus; webhookUrl: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [keys, setKeys] = useState(initialKeys);
  const [newKeys, setNewKeys] = useState<Partial<Record<SecretName, string>>>({});
  const dirty = JSON.stringify(s) !== JSON.stringify(saved) || Object.values(newKeys).some((v) => v?.trim());

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
      const result = await save(s, newKeys);
      if (result.ok) {
        setSaved(s);
        setNewKeys({});
      }
      if (result.keys) setKeys(result.keys);
      setStatus(result);
    });
  }

  const slug = TABS.find(([id]) => id === tab)![1].toLowerCase().replace(/[^a-z]+/g, "-");

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <a className="adm-brand" href="/" target="_blank" rel="noopener">
          <img src="/images/logo.png" alt="" width={40} height={34} />
          <span>EICR_LONDON<small>root@admin</small></span>
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
          <h1 key={tab}><span>~/admin/</span><b style={{ "--n": slug.length } as React.CSSProperties}>{slug}</b><i aria-hidden="true" /></h1>
          <span className="adm-live"><b />online</span>
        </header>
        {!canSave && <p className="adm-alert">Blob store offline. Saving disabled.</p>}

        {tab === "overview" && (
          <div className="adm-grid">
            {bookings}
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
          </div>
        )}

        {tab === "prices" && (
          <div className="adm-stack">
            <Card title="Service prices" wide>
              <div className="adm-cols">
                {services.map((svc) => (
                  <Money key={svc.slug} label={svc.title} value={s.prices[svc.slug]} onChange={(n) => update((d) => void (d.prices[svc.slug] = n))} />
                ))}
              </div>
            </Card>
            <Card title="Extra by property size">
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
            <Card title="Commercial properties">
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
            <Card title="Multi-service offer">
              <Toggle label="Offer is on" checked={s.offer.enabled} onChange={(on) => update((d) => void (d.offer.enabled = on))} />
              <div className="adm-cols">
                <Money label="2 services" unit="% off" step="1" value={s.offer.two} onChange={(n) => update((d) => void (d.offer.two = n))} />
                <Money label="3 or more services" unit="% off" step="1" value={s.offer.threePlus} onChange={(n) => update((d) => void (d.offer.threePlus = n))} />
              </div>
            </Card>
            <Card title="Top banner">
              <Toggle label="Show the banner" checked={s.announcement.enabled} onChange={(on) => update((d) => void (d.announcement.enabled = on))} />
              <Words label="Message" value={s.announcement.text} onChange={(t) => update((d) => void (d.announcement.text = t))} />
              <Words label="Opens this page when clicked" value={s.announcement.link} onChange={(t) => update((d) => void (d.announcement.link = t))} />
            </Card>
            <Card title="Live preview" wide>
              <div className="adm-site">
                <div className="adm-site-bar"><i /><i /><i /><span>eicrinlondon.co.uk</span></div>
                {s.announcement.enabled && s.announcement.text ? <p className="adm-site-banner">{s.announcement.text}</p> : <p className="adm-site-off">Banner hidden</p>}
                <div className="adm-site-head"><b>EICR</b><span>IN LONDON</span></div>
                <div className="adm-site-body">
                  <p className="adm-site-label">Booking page</p>
                  {s.offer.enabled ? <p className="adm-site-offer">Offer: {s.offer.two}% off 2 services, {s.offer.threePlus}% off 3 or more</p> : <p className="adm-site-off">Offer off</p>}
                  <Example slugs={["eicr-certificate", "gas-safety"]} s={s} />
                  <Example slugs={["eicr-certificate", "gas-safety", "epc"]} s={s} />
                </div>
              </div>
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
            <Card title="Contact details">
              <Words label="Phone" value={s.business.phone} fallback={DEFAULT_SETTINGS.business.phone} onChange={(t) => update((d) => void (d.business.phone = t))} />
              <Words label="WhatsApp number (country code, numbers only)" value={s.business.whatsapp} fallback={DEFAULT_SETTINGS.business.whatsapp} onChange={(t) => update((d) => void (d.business.whatsapp = t))} />
              <Words label="Email" value={s.business.email} fallback={DEFAULT_SETTINGS.business.email} onChange={(t) => update((d) => void (d.business.email = t))} />
              <Words label="Address" value={s.business.address} fallback={DEFAULT_SETTINGS.business.address} onChange={(t) => update((d) => void (d.business.address = t))} />
            </Card>
          </div>
        )}

        {tab === "reviews" && reviews}

        {tab === "settings" && (
          <div className="adm-stack">
            <Card title="Stripe payments">
              <Toggle label="Card payments off (bookings by email only)" checked={s.payments.requestOnly} onChange={(on) => update((d) => void (d.payments.requestOnly = on))} />
              {(["stripeSecretKey", "stripeWebhookSecret"] as const).map((k) => (
                <Key key={k} name={k} status={keys[k]} value={newKeys[k] ?? ""} onChange={(t) => setNewKeys({ ...newKeys, [k]: t })} />
              ))}
              <label className="adm-text">
                <span>Webhook URL</span>
                <input readOnly value={webhookUrl} onFocus={(e) => e.target.select()} />
              </label>
              <p className="adm-cta"><a className="adm-btn" href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">Open Stripe</a></p>
            </Card>
            <Card title="Google">
              <Words label="Analytics measurement ID" placeholder="G-XXXXXXXXXX" value={s.tracking.gaId} onChange={(t) => update((d) => void (d.tracking.gaId = t))} />
              <Words label="Ads conversion ID" placeholder="AW-123456789" value={s.tracking.adsId} onChange={(t) => update((d) => void (d.tracking.adsId = t))} />
              <Words label="Ads conversion label" value={s.tracking.adsLabel} onChange={(t) => update((d) => void (d.tracking.adsLabel = t))} />
              <Words label="Google review link (opens from /review/)" placeholder="https://g.page/r/…/review" value={s.links.googleReview} onChange={(t) => update((d) => void (d.links.googleReview = t))} />
              <p className="adm-cta"><a className="adm-btn" href="https://analytics.google.com/" target="_blank" rel="noopener">Open Analytics</a></p>
            </Card>
            <Card title="Email">
              <Key name="resendApiKey" status={keys.resendApiKey} value={newKeys.resendApiKey ?? ""} onChange={(t) => setNewKeys({ ...newKeys, resendApiKey: t })} />
              <Words label="Send bookings, quotes and reviews to" placeholder={s.business.email} value={s.notify.email} onChange={(t) => update((d) => void (d.notify.email = t))} />
            </Card>
            <Card title="Bank transfer">
              <Words label="Bank details on invoices" long placeholder={"Account name\nSort code\nAccount number"} value={s.payments.bankDetails} onChange={(t) => update((d) => void (d.payments.bankDetails = t))} />
            </Card>
            <Card title="Social media">
              {SOCIAL.map(([key, label]) => (
                <Words key={key} label={label} placeholder={`https://${label.toLowerCase()}.com/…`} value={s.business[key]} onChange={(t) => update((d) => void (d.business[key] = t))} />
              ))}
            </Card>
          </div>
        )}

        {tab !== "overview" && tab !== "reviews" && (
          <div className={`adm-bar${dirty ? " dirty" : ""}`}>
            <p className={status?.ok === false ? "bad" : ""} aria-live="polite">{status?.message ?? (dirty ? "Unsaved changes" : "Synced")}</p>
            <button type="button" onClick={submit} disabled={saving || !canSave || !dirty}>{saving ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

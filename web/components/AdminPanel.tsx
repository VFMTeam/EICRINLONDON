"use client";

import { useState, useTransition } from "react";
import { save } from "@/app/admin/actions";
import { BEDROOM_BANDS, COMMERCIAL_TYPES, HOME_TABLE_PRICES, type Settings } from "@/lib/pricing";
import { getService, services } from "@/lib/services";

function Num({ label, value, onChange, prefix = "£", step = "0.01" }: { label: string; value: number; onChange: (n: number) => void; prefix?: string; step?: string }) {
  return (
    <label className="admin-row">
      <span>{label}</span>
      <span className="admin-input">
        {prefix && <i>{prefix}</i>}
        <input type="number" min="0" step={step} value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.valueAsNumber)} />
      </span>
    </label>
  );
}

export default function AdminPanel({ initial, canSave }: { initial: Settings; canSave: boolean }) {
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const update = (change: (draft: Settings) => void) => {
    setS((prev) => {
      const next = structuredClone(prev);
      change(next);
      return next;
    });
    setStatus(null);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => setStatus(await save(s)));
  }

  return (
    <form onSubmit={submit} className="admin-form">
      <section className="admin-card">
        <h2>Multi-service offer</h2>
        <label className="admin-check">
          <input type="checkbox" checked={s.offer.enabled} onChange={(e) => update((d) => void (d.offer.enabled = e.target.checked))} />
          <span>Give a discount when a customer books more than one service</span>
        </label>
        <Num label="2 services, % off" prefix="%" step="1" value={s.offer.two} onChange={(n) => update((d) => void (d.offer.two = n))} />
        <Num label="3 or more services, % off" prefix="%" step="1" value={s.offer.threePlus} onChange={(n) => update((d) => void (d.offer.threePlus = n))} />
      </section>

      <section className="admin-card">
        <h2>Service prices</h2>
        <p className="admin-hint">Starting price inc. VAT, shown on the home, services, pricing and booking pages.</p>
        {services.map((svc) => (
          <Num key={svc.slug} label={svc.title} value={s.prices[svc.slug]} onChange={(n) => update((d) => void (d.prices[svc.slug] = n))} />
        ))}
      </section>

      <section className="admin-card">
        <h2>Extra by property size</h2>
        <p className="admin-hint">Added to the starting price for homes.</p>
        {(["eicr", "epc", "asbestos"] as const).map((k) => (
          <div key={k} className="admin-group">
            <h3>{k === "eicr" ? "EICR" : k === "epc" ? "EPC" : "Asbestos Survey"}</h3>
            {BEDROOM_BANDS[k].map((band, i) => (
              <Num key={band} label={band} value={s.bedrooms[k][i]} onChange={(n) => update((d) => void (d.bedrooms[k][i] = n))} />
            ))}
          </div>
        ))}
        <div className="admin-group">
          <h3>Fire Risk Assessment</h3>
          <Num label="Each storey after the first" value={s.fireRisk.perStorey} onChange={(n) => update((d) => void (d.fireRisk.perStorey = n))} />
          <Num label="Each bedroom after the second" value={s.fireRisk.perBedroom} onChange={(n) => update((d) => void (d.fireRisk.perBedroom = n))} />
        </div>
      </section>

      <section className="admin-card">
        <h2>Booking fees</h2>
        <Num label="Paid parking nearby" value={s.fees.paidParking} onChange={(n) => update((d) => void (d.fees.paidParking = n))} />
        <Num label="No allocated parking" value={s.fees.noParking} onChange={(n) => update((d) => void (d.fees.noParking = n))} />
        <Num label="Congestion charge" value={s.fees.congestion} onChange={(n) => update((d) => void (d.fees.congestion = n))} />
      </section>

      <section className="admin-card">
        <h2>Commercial properties</h2>
        <p className="admin-hint">Each price is multiplied by the premises type, e.g. 1.2 adds 20%.</p>
        {COMMERCIAL_TYPES.map(([id, label]) => (
          <Num key={id} label={label} prefix="×" value={s.commercial.factors[id]} onChange={(n) => update((d) => void (d.commercial.factors[id] = n))} />
        ))}
        <h3>Lowest commercial price</h3>
        {Object.keys(s.commercial.minimums).map((slug) => (
          <Num key={slug} label={getService(slug)?.title ?? slug} value={s.commercial.minimums[slug]} onChange={(n) => update((d) => void (d.commercial.minimums[slug] = n))} />
        ))}
      </section>

      <section className="admin-card">
        <h2>Other home page prices</h2>
        {HOME_TABLE_PRICES.map(([key, label]) => (
          <Num key={key} label={label} value={s.homeTable[key]} onChange={(n) => update((d) => void (d.homeTable[key] = n))} />
        ))}
      </section>

      <div className="admin-bar">
        <p className={status?.ok === false ? "admin-error" : ""} aria-live="polite">{status?.message}</p>
        <button type="submit" className="admin-save" disabled={saving || !canSave}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}

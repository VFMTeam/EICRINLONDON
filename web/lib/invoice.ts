import { randomBytes } from "node:crypto";
import { BOOKING_SERVICES, gbp, type Quote } from "@/lib/pricing";
import { prettyDate, slotLabel } from "@/lib/slots";
import { site } from "@/lib/site";

export type InvoiceMethod = "card" | "bank" | "cash";

export type Invoice = {
  number: string;
  name: string;
  email: string;
  address: string;
  date: string;
  slot: string;
  lines: [label: string, price: number][];
  total: number;
  method: InvoiceMethod;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

export const invoiceNumber = (ref = randomBytes(3).toString("hex")) =>
  `INV-${today().replace(/-/g, "").slice(2)}-${ref.slice(-6).toUpperCase()}`;

export const quoteLines = (q: Quote): Invoice["lines"] => [
  ...q.lines.map((l) => [l.title, l.price] as [string, number]),
  ...(q.parking ? [["Parking", q.parking] as [string, number]] : []),
  ...(q.congestion ? [["Congestion zone", q.congestion] as [string, number]] : []),
];

// Stripe metadata values are capped at 500 characters, so lines travel as "slug:price;...".
export const packLines = (q: Quote) =>
  [...q.lines.map((l) => `${l.slug}:${l.price}`), ...(q.parking ? [`parking:${q.parking}`] : []), ...(q.congestion ? [`congestion:${q.congestion}`] : [])].join(";");

const titles = new Map<string, string>([
  ...Object.values(BOOKING_SERVICES).flat(),
  ["parking", "Parking"],
  ["congestion", "Congestion zone"],
]);

export const unpackLines = (s: string): Invoice["lines"] =>
  s.split(";").flatMap((part) => {
    const [slug, price] = part.split(":");
    return titles.has(slug) && Number.isFinite(Number(price)) ? [[titles.get(slug)!, Number(price)] as [string, number]] : [];
  });

const METHOD_TEXT: Record<InvoiceMethod, string> = {
  card: "Paid by card",
  cash: "To pay in cash to the engineer on the day",
  bank: "To pay by bank transfer",
};

const bankDetails = () => process.env.BANK_DETAILS?.trim() ?? "";

const issued = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

const visitText = (inv: Invoice) =>
  /^\d{4}-\d{2}-\d{2}$/.test(inv.date) ? [prettyDate(inv.date), slotLabel(inv.slot)].filter(Boolean).join(", ") : "";

function invoiceText(inv: Invoice) {
  const visit = visitText(inv);
  const bank = inv.method === "bank" ? bankDetails() || "We will send our bank details separately." : "";
  return [
    `Invoice ${inv.number}`,
    issued(),
    "",
    `Billed to: ${inv.name}`,
    inv.address,
    ...(visit ? [`Visit: ${visit}`] : []),
    "",
    ...inv.lines.map(([label, price]) => `${label}: ${gbp(price)}`),
    `Total inc. VAT: ${gbp(inv.total)}`,
    METHOD_TEXT[inv.method],
    ...(bank ? ["", bank] : []),
    "",
    site.name,
    site.address,
    `${site.phone} · ${site.email}`,
  ].join("\n");
}

function invoiceHtml(inv: Invoice) {
  const cell = "padding:6px 0;border-bottom:1px solid #eee";
  const rows = inv.lines
    .map(([label, price]) => `<tr><td style="${cell}">${escapeHtml(label)}</td><td align="right" style="${cell}">${gbp(price)}</td></tr>`)
    .join("");
  const visit = visitText(inv);
  const bank = bankDetails();
  return `<div style="max-width:520px;font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.5">
<p style="margin:0 0 16px"><b>${site.name}</b><br>Invoice ${inv.number}<br>${issued()}</p>
<p style="margin:0 0 16px">${escapeHtml(inv.name)}<br>${escapeHtml(inv.address)}${visit ? `<br>Visit: ${visit}` : ""}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:8px 0"><b>Total inc. VAT</b></td><td align="right" style="padding:8px 0"><b>${gbp(inv.total)}</b></td></tr>
</table>
<p style="margin:8px 0 0">${METHOD_TEXT[inv.method]}</p>
${inv.method === "bank" ? `<p style="margin:12px 0 0">${bank ? escapeHtml(bank).replace(/\n/g, "<br>") : "We will send our bank details separately."}</p>` : ""}
<p style="margin:24px 0 0;color:#777;font-size:12px">${site.name}, ${escapeHtml(site.address)}<br>${site.phone} · ${site.email}</p>
</div>`;
}

// Sent through Resend. Never throws: a failed invoice must not undo a booking.
export async function emailInvoice(inv: Invoice, idempotencyKey?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)) return "skipped";
  const from = process.env.INVOICE_FROM_EMAIL ?? `${site.name} <${site.email}>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
      },
      body: JSON.stringify({
        from,
        to: inv.email,
        reply_to: site.email,
        subject: `Your invoice ${inv.number} from ${site.name}`,
        html: invoiceHtml(inv),
        text: invoiceText(inv),
      }),
    });
    if (!res.ok) {
      console.error("Resend rejected the invoice", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("Invoice email failed", e);
    return "failed";
  }
}

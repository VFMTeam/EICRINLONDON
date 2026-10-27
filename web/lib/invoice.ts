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

function bankBlock() {
  const details = process.env.BANK_DETAILS?.trim();
  return details
    ? `<p style="margin:16px 0 4px;font-weight:bold">Bank details</p><p style="margin:0">${escapeHtml(details).replace(/\n/g, "<br>")}</p>`
    : `<p style="margin:16px 0 0">We will send our bank details separately.</p>`;
}

function invoiceHtml(inv: Invoice) {
  const cell = "padding:8px 0;border-bottom:1px solid #e5e7eb";
  const rows = inv.lines
    .map(([label, price]) => `<tr><td style="${cell}">${escapeHtml(label)}</td><td align="right" style="${cell}">${gbp(price)}</td></tr>`)
    .join("");
  const visit = /^\d{4}-\d{2}-\d{2}$/.test(inv.date) ? [prettyDate(inv.date), slotLabel(inv.slot)].filter(Boolean).join(", ") : "";
  return `<div style="background:#f4f5f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:14px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:28px">
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px"><tr>
<td><img src="${site.url}/images/logo.png" alt="${site.name}" height="40" style="display:block"></td>
<td align="right" style="font-size:20px;font-weight:bold">Invoice</td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:24px"><tr>
<td valign="top"><b>Billed to</b><br>${escapeHtml(inv.name)}<br>${escapeHtml(inv.address)}</td>
<td valign="top" align="right">${inv.number}<br>${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })}</td>
</tr></table>
${visit ? `<p style="margin:20px 0 0"><b>Visit</b><br>${visit}</p>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:20px">${rows}
<tr><td style="padding:12px 0;font-weight:bold">Total inc. VAT</td><td align="right" style="padding:12px 0;font-weight:bold;font-size:16px">${gbp(inv.total)}</td></tr>
</table>
<p style="margin:8px 0 0">${METHOD_TEXT[inv.method]}</p>
${inv.method === "bank" ? bankBlock() : ""}
<p style="margin:28px 0 0;color:#6b7280;font-size:12px">${site.name} · ${escapeHtml(site.address)}<br>${site.phone} · ${site.email}</p>
</div></div>`;
}

// Sent through Resend. Never throws: a failed invoice must not undo a booking.
export async function emailInvoice(inv: Invoice, idempotencyKey?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)) return "skipped";
  const from = process.env.FORM_FROM_EMAIL ?? "EICR in London <website@eicrinlondon.co.uk>";
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
        reply_to: process.env.FORM_TO_EMAIL ?? site.email,
        subject: `Your invoice ${inv.number} from ${site.name}`,
        html: invoiceHtml(inv),
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

import { randomBytes } from "node:crypto";
import { BOOKING_SERVICES, gbp, type Quote } from "@/lib/pricing";
import { getSecret } from "@/lib/secrets";
import { prettyDate, slotLabel } from "@/lib/slots";
import { getSettings, getSite } from "@/lib/settings";
import { site } from "@/lib/site";
import type { Business } from "@/lib/siteText";

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

const offerLabel = (percent: number) => `Multi-service offer (${percent}% off)`;

export const quoteLines = (q: Quote): Invoice["lines"] => [
  ...q.lines.map((l) => [l.title, l.price] as [string, number]),
  ...(q.discount ? [[offerLabel(q.discountPercent), -q.discount] as [string, number]] : []),
  ...(q.parking ? [["Parking", q.parking] as [string, number]] : []),
  ...(q.congestion ? [["Congestion zone", q.congestion] as [string, number]] : []),
];

// Stripe metadata values are capped at 500 characters, so lines travel as "slug:price;...".
export const packLines = (q: Quote) =>
  [
    ...q.lines.map((l) => `${l.slug}:${l.price}`),
    ...(q.discount ? [`offer${q.discountPercent}:${-q.discount}`] : []),
    ...(q.parking ? [`parking:${q.parking}`] : []),
    ...(q.congestion ? [`congestion:${q.congestion}`] : []),
  ].join(";");

const titles = new Map<string, string>([
  ...Object.values(BOOKING_SERVICES).flat(),
  ["parking", "Parking"],
  ["congestion", "Congestion zone"],
]);

export const unpackLines = (s: string): Invoice["lines"] =>
  s.split(";").flatMap((part) => {
    const [slug, price] = part.split(":");
    const offer = /^offer(\d+)$/.exec(slug);
    const title = offer ? offerLabel(Number(offer[1])) : titles.get(slug);
    return title && Number.isFinite(Number(price)) ? [[title, Number(price)] as [string, number]] : [];
  });

const METHOD_TEXT: Record<InvoiceMethod, string> = {
  card: "Paid by card",
  cash: "To pay in cash to the engineer on the day",
  bank: "To pay by bank transfer",
};

const bankDetails = async () => (await getSettings()).payments.bankDetails || process.env.BANK_DETAILS?.trim() || "";

const issued = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

const visitText = (inv: Invoice) =>
  /^\d{4}-\d{2}-\d{2}$/.test(inv.date) ? [prettyDate(inv.date), slotLabel(inv.slot)].filter(Boolean).join(", ") : "";

function invoiceText(inv: Invoice, contact: Business, bankText: string) {
  const visit = visitText(inv);
  const bank = inv.method === "bank" ? bankText || "We will send our bank details separately." : "";
  return [
    `Invoice ${inv.number}`,
    issued(),
    "",
    `Billed to: ${inv.name}`,
    inv.address,
    ...(visit ? [`Visit: ${visit}`] : []),
    "",
    ...inv.lines.map(([label, price]) => `${label}: ${price < 0 ? `-${gbp(-price)}` : gbp(price)}`),
    `Total inc. VAT: ${gbp(inv.total)}`,
    METHOD_TEXT[inv.method],
    ...(bank ? ["", bank, `Please use ${inv.number} as the payment reference.`] : []),
    "",
    site.name,
    contact.address,
    `${contact.phone} · ${contact.email}`,
  ].join("\n");
}

const BRAND = "#b4532a";

function invoiceHtml(inv: Invoice, contact: Business, bankText: string) {
  const font = "font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121826";
  const cell = "padding:10px 12px;border-bottom:1px solid #e5e7eb";
  const head = "padding:10px 12px;background:#f5f2ef;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#555";
  const rows = inv.lines
    .map(([label, price]) => `<tr><td style="${cell}">${escapeHtml(label)}</td><td align="right" style="${cell}">${price < 0 ? `-${gbp(-price)}` : gbp(price)}</td></tr>`)
    .join("");
  const visit = visitText(inv);
  const bank = bankText;
  const label = (t: string) => `<span style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#777">${t}</span>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid ${BRAND};${font}">
<tr><td style="padding:28px 28px 0">
<table width="100%" cellpadding="0" cellspacing="0" style="${font}"><tr>
<td valign="middle"><img src="${site.url}/images/logo.png" alt="${site.name}" width="58" height="48" style="display:block;border:0"></td>
<td valign="middle" align="right"><span style="font-size:24px;font-weight:bold;letter-spacing:1px;color:${BRAND}">INVOICE</span><br><span style="color:#555">${inv.number}</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 28px 0">
<table width="100%" cellpadding="0" cellspacing="0" style="${font}"><tr>
<td valign="top" width="55%">${label("Billed to")}<br><b>${escapeHtml(inv.name)}</b><br>${escapeHtml(inv.address)}</td>
<td valign="top" align="right">${label("Date")}<br>${issued()}${visit ? `<br><br>${label("Visit")}<br>${visit}` : ""}</td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 28px 0">
<table width="100%" cellpadding="0" cellspacing="0" style="${font};border:1px solid #e5e7eb;border-collapse:collapse">
<tr><th align="left" style="${head}">Description</th><th align="right" style="${head}">Amount</th></tr>
${rows}
<tr><td style="padding:12px;font-weight:bold">Total inc. VAT</td><td align="right" style="padding:12px;font-weight:bold;font-size:18px;color:${BRAND}">${gbp(inv.total)}</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 28px 0">
<table width="100%" cellpadding="0" cellspacing="0" style="${font};background:#f9fafb;border-left:3px solid ${inv.method === "card" ? "#16a34a" : BRAND}"><tr><td style="padding:12px 14px">
<b>${METHOD_TEXT[inv.method]}</b>${inv.method === "bank" ? `<br>${bank ? escapeHtml(bank).replace(/\n/g, "<br>") : "We will send our bank details separately."}<br>Please use ${inv.number} as the payment reference.` : ""}
</td></tr></table>
</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px">Thank you for choosing ${site.name}. Any questions, just reply to this email or call ${contact.phone}.</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#777;font-family:Arial,Helvetica,sans-serif">
<b style="color:#121826">${site.name}</b><br>${escapeHtml(contact.address)}<br>${contact.phone} · <a href="mailto:${contact.email}" style="color:#777">${contact.email}</a> · <a href="${site.url}" style="color:#777">${site.url.replace(/^https?:\/\//, "")}</a>
</td></tr>
</table>
</td></tr></table>`;
}

// Sent through Resend. Never throws: a failed invoice must not undo a booking.
export async function emailInvoice(inv: Invoice, idempotencyKey?: string) {
  const apiKey = await getSecret("resendApiKey");
  if (!apiKey || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.email)) return "skipped";
  const bank = await bankDetails();
  const from = process.env.INVOICE_FROM_EMAIL ?? `${site.name} <${site.email}>`;
  const contact = await getSite();
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
        reply_to: contact.email,
        subject: `Your invoice ${inv.number} from ${site.name}`,
        html: invoiceHtml(inv, contact, bank),
        text: invoiceText(inv, contact, bank),
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

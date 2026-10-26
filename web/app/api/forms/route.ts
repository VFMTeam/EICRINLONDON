import { NextResponse } from "next/server";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

// Receives the quote form (public/js/main.js posts it here) and emails it to
// the business through Resend. Needs RESEND_API_KEY; see web/SETUP.md.

const reply = (success: boolean, message: string, status = 200) =>
  NextResponse.json({ success, data: { message } }, { status });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);

// Best-effort limit of 5 submissions per IP per 10 minutes on each server instance.
const recent = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(false, "Please complete the form and try again.", 400);
  }
  const field = (name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);

  if (field("action", 40) !== "eicr_quote") return reply(false, "Unknown form.", 400);
  // Hidden honeypot field: real visitors leave it empty, spam bots fill it in.
  if (field("company_website", 200)) return NextResponse.json({ success: true, data: { message: "Thank you. Our team will be in touch shortly.", suppressed: true } });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return reply(false, "Too many requests. Please wait a few minutes or call us.", 429);

  const name = field("name", 100);
  const email = field("email", 254);
  const phone = field("phone", 50);
  const service = field("service", 120);
  const details = field("details", 5000);
  if (!name || !phone || !details) return reply(false, "Please fill in your name, phone and the work details.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(false, "Please enter a valid email address.", 400);
  if (service && !services.some((s) => s.title === service)) return reply(false, "Please choose a service from the list.", 400);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FORM_TO_EMAIL ?? site.email;
  const from = process.env.FORM_FROM_EMAIL ?? "EICR in London <website@eicrinlondon.co.uk>";
  if (!apiKey) {
    console.error("Quote form received but RESEND_API_KEY is not set, so no email was sent.");
    return reply(false, `Online quotes are not connected yet. Please call ${site.phone} or email ${site.email}.`, 503);
  }

  const rows = [["Name", name], ["Email", email], ["Phone", phone], ["Service", service || "Not selected"], ["Details", details]];
  const html = `<h2>New quote request</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${k}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, reply_to: email, subject: `Quote request: ${service || "General"} – ${name}`, html }),
  });
  if (!res.ok) {
    console.error("Resend rejected the quote email", res.status, await res.text());
    return reply(false, `Sorry, we could not send your request. Please call ${site.phone}.`, 502);
  }
  return reply(true, "Thank you. Your quote request has been sent and our team will be in touch shortly.");
}

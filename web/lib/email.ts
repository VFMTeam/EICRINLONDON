import { site } from "@/lib/site";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!);

export async function emailTeam(subject: string, heading: string, rows: string[][], replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "not-configured";
  const to = process.env.FORM_TO_EMAIL ?? site.email;
  const from = process.env.FORM_FROM_EMAIL ?? "EICR in London <website@eicrinlondon.co.uk>";
  const html = `<h2>${escapeHtml(heading)}</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><th align="left" valign="top">${k}</th><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, ...(replyTo && { reply_to: replyTo }), subject, html }),
  });
  if (!res.ok) {
    console.error("Resend rejected the email", res.status, await res.text());
    return "failed";
  }
  return "sent";
}

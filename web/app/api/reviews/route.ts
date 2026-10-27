import { NextResponse } from "next/server";
import { emailTeam } from "@/lib/email";
import { addReview } from "@/lib/reviews";
import { services } from "@/lib/services";
import { getSite } from "@/lib/settings";

const reply = (success: boolean, message: string, status = 200) => NextResponse.json({ success, message }, { status });

// Best-effort limit of 4 reviews per IP per 10 minutes on each server instance.
const recent = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 4;
}

const THANKS = "Thank you for your review. It will appear on the website once it has been checked.";

export async function POST(request: Request) {
  const site = await getSite();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(false, "Please complete the form and try again.", 400);
  }
  const field = (name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);

  if (field("company_website", 200)) return reply(true, THANKS);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return reply(false, "Too many reviews from this connection. Please try again later.", 429);

  const name = field("name", 60);
  const service = field("service", 120);
  const rating = Number(field("rating", 1));
  const text = String(form.get("review") ?? "").trim();
  if (!name || !service || !text || ![1, 2, 3, 4, 5].includes(rating)) return reply(false, "Please choose a service, select a rating and write your review.", 400);
  if (!services.some((s) => s.title === service)) return reply(false, "Please choose a service from the list.", 400);
  if (text.length > 1500) return reply(false, "Please keep your review under 1,500 characters.", 400);
  if (form.get("consent") !== "yes") return reply(false, "Please agree to your name and review being shown on the website.", 400);

  try {
    await addReview({ name, service, rating, text });
  } catch (e) {
    console.error("Saving a review failed", e);
    return reply(false, `Sorry, your review could not be saved. Please try again or email ${site.email}.`, 503);
  }

  await emailTeam(`New review waiting: ${rating}/5 – ${name}`, "New review waiting for approval", [
    ["Name", name],
    ["Service", service],
    ["Rating", `${rating} out of 5`],
    ["Review", text],
    ["Approve", `${site.url}/admin/`],
  ]).catch(() => "failed");

  return reply(true, THANKS);
}

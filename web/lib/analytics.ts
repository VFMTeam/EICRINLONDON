import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings";

// Visitor numbers from the Google Analytics Data API, read with a service
// account key saved in /admin/ Settings. Cached for 15 minutes.
export const CLICK_EVENTS = [
  ["phone_click", "Phone clicks"],
  ["whatsapp_click", "WhatsApp clicks"],
  ["booking_click", "Book now clicks"],
  ["quote_request", "Quote requests"],
  ["email_click", "Email clicks"],
] as const;

export type Period = { visitors: number; sessions: number; views: number; clicks: Record<string, number> };
export type VisitorReport = { week: Period; month: Period; pages: [string, number][] } | { error: string } | null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

async function accessToken(account: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signature = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(account.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

type Row = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };

async function runReport(property: string, token: string, body: object) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 403 ? "No access to this Analytics property" : `Analytics error (${res.status})`);
  return ((await res.json()) as { rows?: Row[] }).rows ?? [];
}

const RANGES = [
  { startDate: "7daysAgo", endDate: "today", name: "week" },
  { startDate: "28daysAgo", endDate: "today", name: "month" },
];

async function loadReport(property: string, keyJson: string): Promise<VisitorReport> {
  if (!property || !keyJson) return null;
  try {
    const token = await accessToken(JSON.parse(keyJson));
    const [totals, events, pages] = await Promise.all([
      runReport(property, token, { dateRanges: RANGES, metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }] }),
      runReport(property, token, {
        dateRanges: RANGES,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: CLICK_EVENTS.map(([e]) => e) } } },
      }),
      runReport(property, token, { dateRanges: [RANGES[1]], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], limit: 5, orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }] }),
    ]);
    const period = (name: string): Period => {
      const t = totals.find((r) => r.dimensionValues.some((d) => d.value === name));
      const clicks = Object.fromEntries(CLICK_EVENTS.map(([e]) => [e, 0]));
      for (const r of events) if (r.dimensionValues[1]?.value === name) clicks[r.dimensionValues[0].value] = Number(r.metricValues[0].value);
      const n = (i: number) => Number(t?.metricValues[i]?.value ?? 0);
      return { visitors: n(0), sessions: n(1), views: n(2), clicks };
    };
    return { week: period("week"), month: period("month"), pages: pages.map((r) => [r.dimensionValues[0].value, Number(r.metricValues[0].value)]) };
  } catch (e) {
    console.error("Google Analytics report failed", e);
    return { error: e instanceof Error && !(e instanceof SyntaxError) ? e.message : "The service account key is not valid" };
  }
}

const cachedReport = unstable_cache(loadReport, ["ga-report"], { revalidate: 900 });

export async function visitorReport() {
  const property = (await getSettings()).tracking.gaPropertyId;
  return cachedReport(property, await getSecret("gaServiceAccount"));
}

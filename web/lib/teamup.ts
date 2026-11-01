import { getSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings";
import { SLOTS } from "@/lib/slots";

export type TeamupJob = { visit: string; slot?: string; services: string[]; address?: string; postcode: string; notes?: string; name: string; phone?: string; property?: string };

const WORK_ORDERS: [RegExp, string][] = [
  [/EICR/i, "EICR"],
  [/Gas Safety/i, "GAS"],
  [/Energy Performance/i, "EPC"],
  [/PAT/, "PAT"],
  [/Fuse Box/i, "Fuse Box"],
  [/Fire Alarm/i, "Fire Alarm"],
  [/Fire Risk/i, "FRA"],
  [/Fire Safety/i, "Fire Safety"],
  [/Emergency Lighting/i, "Emergency Lighting"],
  [/Smoke Detector/i, "Smoke Detector"],
  [/Fire Extinguisher/i, "Fire Extinguisher"],
  [/Asbestos/i, "Asbestos"],
  [/Health & Safety/i, "Health & Safety"],
  [/Boiler/i, "Boiler Service"],
];

export const workOrders = (services: string[]) => [...new Set(services.flatMap((s) => WORK_ORDERS.filter(([re]) => re.test(s)).map(([, code]) => code)))];
export const propertyType = (j: Pick<TeamupJob, "property">) => (j.property?.startsWith("Commercial") ? "Commercial" : "Residential");
export const jobLocation = (j: Pick<TeamupJob, "address" | "postcode">) => [j.address, j.postcode].filter(Boolean).join(", ");
export const jobDescription = (j: Pick<TeamupJob, "notes" | "phone">) => [j.notes, j.phone && `Phone: ${j.phone}`].filter(Boolean).join("\n\n");

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const norm = (s: string) => s.trim().toUpperCase();

type Choice = { value?: string; id?: string; name?: string; label?: string };
type Field = { id: string; name?: string; type?: string; choices?: Choice[]; type_data?: { choices?: Choice[]; multiple?: boolean } };

// Fills the calendar's own custom fields (Company, Work Order, Property Type,
// Name on report) by name. Choice fields need the option ids, read from Teamup.
async function customFields(api: string, headers: Record<string, string>, j: TeamupJob, company: string) {
  const res = await fetch(`${api}/field-definitions`, { headers }).catch(() => null);
  if (!res?.ok) return {};
  const json = (await res.json().catch(() => ({}))) as { definitions?: Field[]; fields?: Field[] };
  const custom: Record<string, string | string[]> = {};
  const wanted: Record<string, string[]> = {
    COMPANY: company ? [company] : [],
    "WORK ORDER": workOrders(j.services),
    "PROPERTY TYPE": [propertyType(j)],
    "NAME ON REPORT": [j.name],
  };
  for (const f of json.definitions ?? json.fields ?? []) {
    const values = wanted[norm(f.name ?? "")];
    if (!values?.length || f.id.startsWith("builtin")) continue;
    const choices = f.type_data?.choices ?? f.choices;
    if (!choices) {
      custom[f.id] = values.join(", ");
      continue;
    }
    const picked = choices.filter((c) => values.some((v) => norm(v) === norm(c.name ?? c.label ?? ""))).map((c) => String(c.value ?? c.id));
    if (picked.length) custom[f.id] = f.type_data?.multiple === false ? picked.slice(0, 1) : picked;
  }
  return custom;
}

// Adds the job to the Teamup calendar on its inspection date. Never throws.
export async function addToTeamup(j: TeamupJob) {
  const [token, calendar, { teamup }] = await Promise.all([getSecret("teamupApiKey"), getSecret("teamupCalendarKey"), getSettings()]);
  if (!token || !calendar || !teamup.subcalendarId || !/^\d{4}-\d{2}-\d{2}$/.test(j.visit)) return "skipped";
  const api = `https://api.teamup.com/${encodeURIComponent(calendar)}`;
  const headers = { "Teamup-Token": token, "Content-Type": "application/json" };
  const slot = SLOTS.find((s) => s.id === j.slot);
  try {
    const res = await fetch(`${api}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        subcalendar_ids: [Number(teamup.subcalendarId)],
        title: j.postcode,
        location: jobLocation(j),
        notes: escape(jobDescription(j)).replace(/\n/g, "<br>"),
        all_day: !slot,
        start_dt: `${j.visit}T${slot?.start ?? "00:00"}:00`,
        end_dt: `${j.visit}T${slot?.end ?? "23:59"}:00`,
        tz: "Europe/London",
        custom: await customFields(api, headers, j, teamup.company),
      }),
    });
    if (!res.ok) {
      console.error("Teamup rejected the job", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("Teamup request failed", e);
    return "failed";
  }
}

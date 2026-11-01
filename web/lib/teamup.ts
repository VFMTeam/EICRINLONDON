import { getSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings";
import { SLOTS } from "@/lib/slots";

export type TeamupJob = { visit: string; slot?: string; services: string[]; address?: string; postcode: string; notes?: string };

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const jobTitle = (j: TeamupJob) => `${j.services.join(" + ")} – ${j.postcode}`;
export const jobLocation = (j: TeamupJob) => [j.address, j.postcode].filter(Boolean).join(", ");

// Adds the job to the Teamup calendar on its inspection date. Never throws.
export async function addToTeamup(j: TeamupJob) {
  const [token, calendar, { teamup }] = await Promise.all([getSecret("teamupApiKey"), getSecret("teamupCalendarKey"), getSettings()]);
  if (!token || !calendar || !teamup.subcalendarId || !/^\d{4}-\d{2}-\d{2}$/.test(j.visit)) return "skipped";
  const slot = SLOTS.find((s) => s.id === j.slot);
  try {
    const res = await fetch(`https://api.teamup.com/${encodeURIComponent(calendar)}/events`, {
      method: "POST",
      headers: { "Teamup-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({
        subcalendar_ids: [Number(teamup.subcalendarId)],
        title: jobTitle(j),
        location: jobLocation(j),
        notes: j.notes ? escape(j.notes).replace(/\n/g, "<br>") : "",
        all_day: !slot,
        start_dt: `${j.visit}T${slot?.start ?? "00:00"}:00`,
        end_dt: `${j.visit}T${slot?.end ?? "23:59"}:00`,
        tz: "Europe/London",
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

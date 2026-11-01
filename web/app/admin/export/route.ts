import { isAdmin } from "@/lib/admin";
import { listBookings, type BookingRecord } from "@/lib/bookings";
import { SLOTS } from "@/lib/slots";
import { jobLocation, jobTitle } from "@/lib/teamup";

export const dynamic = "force-dynamic";

const london = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });

function cell(v: string | number | undefined) {
  let t = String(v ?? "");
  if (/^[=+\-@]/.test(t)) t = `'${t}`;
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Not found", { status: 404 });
  const range = new URL(request.url).searchParams.get("range") ?? "today";
  const today = london(new Date());
  const pick: Record<string, (b: BookingRecord) => boolean> = {
    today: (b) => b.visit === today,
    upcoming: (b) => b.visit >= today,
    all: () => true,
  };
  const rows = (await listBookings()).filter(pick[range] ?? pick.today).sort((a, b) => `${a.visit}${a.slot}`.localeCompare(`${b.visit}${b.slot}`));
  const head = ["Subject", "Start Date", "Start Time", "End Date", "End Time", "All Day Event", "Location", "Description"];
  const lines = rows.map((b) => {
    const slot = SLOTS.find((s) => s.id === b.slot);
    const date = b.visit.split("-").reverse().join("/");
    return [jobTitle(b), date, slot?.start ?? "", date, slot?.end ?? "", slot ? "No" : "Yes", jobLocation(b), b.notes].map(cell).join(",");
  });
  return new Response(`﻿${[head.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamup-${range}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

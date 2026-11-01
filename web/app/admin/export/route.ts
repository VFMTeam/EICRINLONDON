import { isAdmin } from "@/lib/admin";
import { listBookings, type BookingRecord } from "@/lib/bookings";
import { SLOTS } from "@/lib/slots";
import { METHODS } from "@/components/AdminBookings";

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
  const head = ["Subject", "Start Date", "Start Time", "End Date", "End Time", "All Day Event", "Location", "Who", "Description"];
  const lines = rows.map((b) => {
    const slot = SLOTS.find((s) => s.id === b.slot);
    const date = b.visit.split("-").reverse().join("/");
    const details = [
      b.phone && `Phone: ${b.phone}`,
      b.email && `Email: ${b.email}`,
      b.property && `Property: ${b.property}`,
      `Services: ${b.services.join(", ")}`,
      ...(b.lines ?? []).map(([t, p]) => `- ${t}: ${p < 0 ? "-" : ""}£${Math.abs(p).toFixed(2)}`),
      `Total: £${b.total.toFixed(2)}`,
      `Payment: ${METHODS[b.method] ?? b.method}`,
      b.parking && `Parking: ${b.parking}`,
      b.congestion != null && `Congestion zone: ${b.congestion ? "Yes" : "No"}`,
      b.notes && `Notes: ${b.notes}`,
    ].filter(Boolean).join("\n");
    return [
      `${b.services.join(" + ")} – ${b.name}, ${b.postcode}`,
      date,
      slot?.start ?? "",
      date,
      slot?.end ?? "",
      slot ? "No" : "Yes",
      [b.address, b.postcode].filter(Boolean).join(", "),
      b.name,
      details,
    ].map(cell).join(",");
  });
  return new Response(`﻿${[head.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamup-${range}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

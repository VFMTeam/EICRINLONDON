import { isAdmin } from "@/lib/admin";
import { listBookings, type BookingRecord } from "@/lib/bookings";
import { slotLabel } from "@/lib/slots";
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
  const head = ["Visit date", "Time", "Name", "Phone", "Email", "Address", "Postcode", "Services", "Payment", "Total", "Notes", "Booked at"];
  const lines = rows.map((b) =>
    [b.visit, b.slot ? slotLabel(b.slot) : "", b.name, b.phone, b.email, b.address, b.postcode, b.services.join(" + "), METHODS[b.method] ?? b.method, b.total.toFixed(2), b.notes, new Date(b.at).toLocaleString("en-GB", { timeZone: "Europe/London" })].map(cell).join(","),
  );
  return new Response(`﻿${[head.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${range}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

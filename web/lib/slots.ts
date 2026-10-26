// Appointment slots for online booking. Customers can book from tomorrow up
// to two weeks ahead, morning or afternoon, seven days a week.
//
// DEMO: availability is made up (a few slots show as taken). To go live,
// replace isTaken() with a check against the team's calendar.
export const SLOTS = [
  { id: "am", label: "Morning", time: "8am – 12pm" },
  { id: "pm", label: "Afternoon", time: "12pm – 5pm" },
] as const;

export type SlotId = (typeof SLOTS)[number]["id"];
export type Day = { date: string; slots: { id: SlotId; free: boolean }[] };

const DAYS_AHEAD = 14;

// "YYYY-MM-DD" in London time, `offset` days from today.
function londonDate(offset: number) {
  return new Date(Date.now() + offset * 864e5).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function isTaken(date: string, slot: SlotId) {
  let h = 0;
  for (const c of date + slot) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 4 === 0;
}

export function availableDays(): Day[] {
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = londonDate(i + 1);
    return { date, slots: SLOTS.map((s) => ({ id: s.id, free: !isTaken(date, s.id) })) };
  });
}

export function isBookable(date: string, slot: string) {
  return availableDays().some((d) => d.date === date && d.slots.some((s) => s.id === slot && s.free));
}

export const slotLabel = (slot: string) => {
  const s = SLOTS.find((x) => x.id === slot);
  return s ? `${s.label} (${s.time})` : "";
};

export const prettyDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

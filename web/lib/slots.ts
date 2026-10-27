export const SLOTS = [
  { id: "am", label: "Morning", time: "8am – 1pm" },
  { id: "pm", label: "Afternoon", time: "1pm – 6pm" },
] as const;

const DAYS_AHEAD = 30;

export function bookableDates() {
  return Array.from({ length: DAYS_AHEAD }, (_, i) =>
    new Date(Date.now() + (i + 1) * 864e5).toLocaleDateString("en-CA", { timeZone: "Europe/London" }),
  );
}

export function isBookable(date: string, slot: string) {
  return bookableDates().includes(date) && SLOTS.some((s) => s.id === slot);
}

export const slotLabel = (slot: string) => {
  const s = SLOTS.find((x) => x.id === slot);
  return s ? `${s.label} (${s.time})` : "";
};

export const prettyDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

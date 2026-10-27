import { readPartial } from "@/lib/content";
import { getService } from "@/lib/services";

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export function quoteFormHtml(service?: string | string[]) {
  const chosen = typeof service === "string" ? getService(service) : undefined;
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  let form = readPartial("pages/request-a-quote").replace('name="preferred_date" type="date"', `name="preferred_date" type="date" min="${tomorrow}"`);
  if (chosen) form = form.replace(`<option value="${escapeAttr(chosen.title)}" >`, `<option value="${escapeAttr(chosen.title)}" selected>`);
  return form;
}

import Reviews from "@/components/Reviews";
import { readPartial } from "@/lib/content";
import { gbp, servicePrice, type Settings } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

const home = (bedrooms: number) => ({ kind: "residential" as const, bedrooms, floors: 1, commercialType: "other" });

// Price tables in content/pages/home.html use {{key}} for every price.
function homePrice(key: string, s: Settings) {
  const [slug, bedrooms] = key.split("@");
  if (bedrooms) return servicePrice(slug, home(Number(bedrooms)), s);
  if (key === "fire-risk/commercial") return s.commercial.minimums["fire-risk"];
  return s.prices[key] ?? s.homeTable[key];
}

export default async function HomePage() {
  const settings = await getSettings();
  const html = readPartial("pages/home").replace(/\{\{([\w@/-]+)(:hourly)?\}\}/g, (token, key: string, hourly?: string) => {
    const price = homePrice(key, settings);
    if (price == null) return token;
    return hourly ? `£${Number.isInteger(price) ? price : price.toFixed(2)}/hr` : gbp(price);
  });
  const [before, after] = html.split("<!--reviews-->");
  return (
    <main id="main-content">
      <div className="site-shell" dangerouslySetInnerHTML={{ __html: before }} />
      <Reviews />
      {after && <div className="site-shell" dangerouslySetInnerHTML={{ __html: after }} />}
    </main>
  );
}

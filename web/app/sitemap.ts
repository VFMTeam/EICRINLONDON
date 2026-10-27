import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { site } from "@/lib/site";
import { areas } from "@/lib/areas";
import { guides } from "@/lib/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "services", "pricing", "areas", "about", "contact", "request-a-quote", "booking", "guides", "privacy", "cookies", "terms"];
  return [
    ...pages.map((p) => ({ url: `${site.url}/${p ? `${p}/` : ""}`, priority: p ? 0.7 : 1 })),
    ...services.map((s) => ({ url: `${site.url}/services/${s.slug}/`, priority: 0.8 })),
    ...areas.map((a) => ({ url: `${site.url}/areas/${a.slug}/`, priority: 0.7 })),
    ...guides.map((g) => ({ url: `${site.url}/guides/${g.slug}/`, priority: 0.6 })),
  ];
}

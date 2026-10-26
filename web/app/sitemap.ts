import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "services", "pricing", "areas", "about", "contact", "request-a-quote", "privacy", "cookies", "terms"];
  return [
    ...pages.map((p) => ({ url: `${site.url}/${p ? `${p}/` : ""}`, priority: p ? 0.7 : 1 })),
    ...services.map((s) => ({ url: `${site.url}/services/${s.slug}/`, priority: 0.8 })),
  ];
}

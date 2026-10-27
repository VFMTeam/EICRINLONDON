import type { Metadata } from "next";
import CorePage from "@/components/CorePage";
import { pageMeta } from "@/lib/content";
import { areas, regions } from "@/lib/areas";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: pageMeta.areas.title },
  description: pageMeta.areas.description,
  alternates: { canonical: "/areas/" },
};

export default function AreasPage() {
  return (
    <CorePage title="Service Areas">
      <div className="core-page-intro">
        <p>We cover all 32 London boroughs, the City of London and selected towns around the M25. Pick your borough to see local prices and postcodes.</p>
      </div>
      <div className="core-area-grid">
        {regions.map((region) => (
          <article key={region}>
            <h2>{region} London</h2>
            <ul className="area-links">
              {areas
                .filter((a) => a.region === region)
                .map((a) => (
                  <li key={a.slug}>
                    <a href={`/areas/${a.slug}/`}>{a.name}</a>
                  </li>
                ))}
            </ul>
          </article>
        ))}
        <article>
          <h2>Greater London &amp; M25</h2>
          <p>Selected towns around the M25, such as Watford, Dartford, Slough and Epsom. Send your postcode and we will confirm availability.</p>
          <p className="core-area-postcodes">
            <b>Not sure?</b> <a href="/booking/">Send your postcode</a> or <a href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>.
          </p>
        </article>
      </div>
    </CorePage>
  );
}

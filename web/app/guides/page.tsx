import type { Metadata } from "next";
import CorePage from "@/components/CorePage";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: { absolute: "Landlord Guides | EICR in London" },
  description: "Plain guides to EICR, gas safety and EPC rules for landlords in England.",
  alternates: { canonical: "/guides/" },
};

export default function GuidesPage() {
  return (
    <CorePage title="Landlord Guides">
      <div className="core-page-intro">
        <p>The rules for electrical, gas and energy certificates on rental properties in England.</p>
      </div>
      <div className="core-service-grid">
        {guides.map((g) => (
          <article key={g.slug}>
            <h2>{g.title}</h2>
            <p>{g.description}</p>
            <div>
              <a href={`/guides/${g.slug}/`}>Read guide</a>
            </div>
          </article>
        ))}
      </div>
    </CorePage>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CorePage from "@/components/CorePage";
import { guides, getGuide } from "@/lib/guides";
import { formatPrice } from "@/lib/services";
import { pricedService } from "@/lib/settings";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return { title: { absolute: `${g.title} | EICR in London` }, description: g.description, alternates: { canonical: `/guides/${g.slug}/` } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const service = await pricedService(g.service);
  const others = guides.filter((o) => o.slug !== g.slug);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <CorePage title={g.title}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="core-copy">
        <p>{g.description}</p>
        {g.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
        {service && (
          <p className="guide-cta">
            <a className="core-cta" href={`/booking/?service=${service.slug}`}>
              Book {service.title} from {formatPrice(service.price)} inc. VAT
            </a>
          </p>
        )}
        <h2>More guides</h2>
        <ul className="area-links">
          {others.map((o) => (
            <li key={o.slug}>
              <a href={`/guides/${o.slug}/`}>{o.title}</a>
            </li>
          ))}
        </ul>
      </div>
    </CorePage>
  );
}

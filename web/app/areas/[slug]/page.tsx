import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { areas, getArea, type Area } from "@/lib/areas";
import { getService, formatPrice } from "@/lib/services";
import { site, telHref } from "@/lib/site";

const featured = ["eicr-certificate", "gas-safety", "boiler-gas-safety-combo", "epc", "fire-risk", "pat-testing", "fire-safety-certificate", "commercial-eicr"];

export const dynamicParams = false;

export function generateStaticParams() {
  return areas.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getArea((await params).slug);
  if (!a) return {};
  const from = (slug: string) => formatPrice(getService(slug)?.price ?? 0).replace(".00", "");
  return {
    title: { absolute: `EICR & Landlord Certificates in ${a.name} | EICR in London` },
    description: `EICR from ${from("eicr-certificate")}, gas safety certificates from ${from("gas-safety")} and EPCs from ${from("epc")} in ${a.name} (${a.postcodes.slice(0, 4).join(", ")}). Prices inc. VAT. Book online or call.`,
    alternates: { canonical: `/areas/${a.slug}/` },
  };
}

function schema(a: Area) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Property safety certificates in ${a.name}`,
    serviceType: "Electrical, gas, energy and fire safety certificates",
    provider: { "@type": "LocalBusiness", name: site.name, url: site.url, telephone: site.phone },
    areaServed: { "@type": "AdministrativeArea", name: `London Borough of ${a.name}` },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArea((await params).slug);
  if (!a) notFound();
  const nearby = a.nearby.map(getArea).filter((n): n is Area => Boolean(n));
  const list = featured.map((slug) => getService(slug)).filter((s) => s !== undefined);
  const faqs: [string, string][] = [
    [`Do you cover all of ${a.name}?`, `Yes. We work across ${a.name}, including ${a.places.join(", ")}. Postcodes we visit include ${a.postcodes.join(", ")}.`],
    ["How often does a rental property need an EICR?", "In England a private landlord needs an EICR at least every five years, or sooner if the last report says so. A copy goes to tenants within 28 days of the inspection."],
    ["Can I book more than one certificate in the same visit?", "Yes. Booking several services together saves you a second visit, and you get a discount on multiple services."],
    ["Do I need to be there?", "No, as long as the engineer can get in. Many landlords arrange access through the tenant or the letting agent."],
  ];

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(a)) }} />
      <article className="service-detail-page">
        <section className="service-detail-hero">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">{a.region} London</p>
            <h1>EICR and Landlord Certificates in {a.name}</h1>
            <p className="service-detail-lead">
              Electrical, gas, EPC and fire safety certificates for homes, rentals and businesses in {a.places.slice(0, 3).join(", ")} and the rest of {a.name}. 10+ years working on London properties.
            </p>
            <div className="service-detail-actions">
              <a className="service-detail-book" href="/booking/">Book now</a>
              <a className="service-detail-quote" href={telHref}>Call {site.phone}</a>
            </div>
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">Prices in {a.name}</p>
            <h2>Popular services</h2>
            <div className="core-price-list">
              {list.map((s) => (
                <div key={s.slug}>
                  <a href={`/services/${s.slug}/`}>{s.title}</a>
                  <strong className="core-price-display">
                    <span className="eicr-current-price">From {formatPrice(s.price)} inc. VAT</span>
                  </strong>
                  <a className="core-book" href={`/booking/?service=${s.slug}`}>Book</a>
                </div>
              ))}
            </div>
            <p className="area-more"><a href="/pricing/">See all prices</a></p>
          </div>
        </section>

        <section className="service-detail-section service-detail-soft">
          <div className="service-detail-wrap service-detail-two">
            <div>
              <p className="service-detail-kicker">Where we work</p>
              <h2>Areas and postcodes in {a.name}</h2>
              <div className="service-detail-editor">
                <p>{a.places.join(", ")}.</p>
                <p className="core-area-postcodes"><b>Postcodes:</b> {a.postcodes.join(", ")}</p>
              </div>
            </div>
            <aside className="service-detail-included">
              <h2>Nearby boroughs</h2>
              <ul className="area-links">
                {nearby.map((n) => (
                  <li key={n.slug}>
                    <a href={`/areas/${n.slug}/`}>{n.name}</a>
                  </li>
                ))}
              </ul>
              <a href="/areas/">All areas</a>
            </aside>
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-wrap service-faq-wrap">
            <p className="service-detail-kicker">Questions</p>
            <h2>Certificates in {a.name}</h2>
            {faqs.map(([q, ans]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{ans}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="service-detail-cta">
          <div className="service-detail-wrap">
            <h2>Need a certificate in {a.name}?</h2>
            <p>Book online, call or send us a WhatsApp message.</p>
            <a href="/booking/">Book now</a>
          </div>
        </section>
      </article>
    </main>
  );
}

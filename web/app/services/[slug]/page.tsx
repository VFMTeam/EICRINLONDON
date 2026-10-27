import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getService, formatPrice, serviceHeroImage, serviceGallery, type Service } from "@/lib/services";
import { getSite, pricedService } from "@/lib/settings";
import { site } from "@/lib/site";
import { serviceDetails } from "@/lib/serviceDetails";
import VerifyRegistration from "@/components/VerifyRegistration";

// Ported from the original theme's single-eicr_service.php.
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getService((await params).slug);
  if (!s) return {};
  const d = serviceDetails[s.slug];
  return {
    title: { absolute: d?.title ?? `${s.title} in London | EICR in London` },
    description: d?.description ?? s.benefit,
    alternates: { canonical: `/services/${s.slug}/` },
    openGraph: { images: [serviceHeroImage(s.slug)] },
  };
}

function galleryAlt(src: string) {
  if (src.includes("property-safety-engineers")) return "Our property safety engineers at work in London";
  const name = src.replace(/^.*\//, "").replace(/(-closeup)?\.\w+$/, "").replace(/^epc-/, "").replace(/-/g, " ");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} work in a London property`;
}

const landlordNotes: Record<string, string> = {
  "eicr-certificate": "Landlords: an EICR is needed at least every 5 years, or sooner if the last report says so.",
  "gas-safety": "Landlords: a Gas Safety Certificate is needed every 12 months.",
  "boiler-gas-safety-combo": "Landlords: a Gas Safety Certificate is needed every 12 months.",
};

function faqs(s: Service): [string, string][] {
  return [
    ...(serviceDetails[s.slug]?.faqs ?? []),
    [`How much does ${s.title} cost?`, `Prices start from ${formatPrice(s.price)} including VAT. The final amount depends on the property details and the scope of work, and we confirm it before the visit.`],
    ["Can I combine this with another service?", "Yes. Book one service online and add the others in the notes, or request a quote, and we will arrange them together, often in a single visit."],
    ["Which areas do you cover?", "All 32 London boroughs, the City of London and selected towns near the M25."],
    ["What should I prepare before the visit?", "Make sure the relevant areas are accessible and tell us about any access instructions or known issues when you book."],
    ["When will the engineer contact me?", "The engineer calls you on the day before they set off."],
  ];
}

function schema(s: Service, phone: string) {
  const url = `${site.url}/services/${s.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.title,
      description: s.benefit,
      url,
      areaServed: "London",
      provider: { "@type": "LocalBusiness", name: site.name, url: site.url, telephone: phone },
      offers: { "@type": "Offer", price: s.price, priceCurrency: "GBP" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs(s).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
        { "@type": "ListItem", position: 2, name: "Services", item: `${site.url}/services/` },
        { "@type": "ListItem", position: 3, name: s.title, item: url },
      ],
    },
  ];
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await pricedService((await params).slug);
  if (!s) notFound();
  const book = `/booking/?service=${s.slug}`;
  const d = serviceDetails[s.slug];

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(s, (await getSite()).phone)) }} />
      <article className="service-detail-page">
        <section className="service-detail-hero">
          <div className="service-detail-wrap service-detail-hero-grid">
            <div>
              <p className="service-detail-kicker">NICEIC registered · 10+ years in London</p>
              <h1>{d?.h1 ?? `${s.title} in London`}</h1>
              <p className="service-detail-lead">{s.benefit}</p>
              <div className="service-detail-price">
                <span className="eicr-current-price">From {formatPrice(s.price)} inc. VAT</span>
              </div>
              {landlordNotes[s.slug] && <p className="service-landlord-note">{landlordNotes[s.slug]}</p>}
              <div className="service-detail-actions">
                <a className="service-detail-book" href={book}>Book now</a>
                <a className="service-detail-quote" href={`/request-a-quote/?service=${s.slug}`}>Request a quote</a>
              </div>
            </div>
            <img src={serviceHeroImage(s.slug)} alt={`${s.title} service in London`} width={1100} height={600} fetchPriority="high" />
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-wrap service-detail-two">
            <div>
              <p className="service-detail-kicker">Service overview</p>
              <h2>{s.title} in London</h2>
              <div className="service-detail-editor">
                {d ? d.intro.map((p) => <p key={p}>{p}</p>) : <p>{s.benefit}</p>}
                <p>We cover homes and businesses across London. Tell us about the property and we will book the right engineer.</p>
              </div>
            </div>
            <aside className="service-detail-included">
              <h2>{d ? "What the engineer checks" : "What you get"}</h2>
              <ul>
                {(d?.checks ?? ["A confirmed date and time", "A qualified engineer for the job", "Findings explained in plain English", "Your certificate or report by email"]).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <a href={book}>Book now</a>
            </aside>
          </div>
        </section>

        <section className="service-detail-section service-detail-soft">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">How it works</p>
            <h2>Four simple steps</h2>
            <div className="service-process">
              <div><b>01</b><h3>Book</h3><p>Book online or call us with the property details.</p></div>
              <div><b>02</b><h3>Confirm</h3><p>We confirm the date, time and access with you.</p></div>
              <div><b>03</b><h3>Visit</h3><p>The engineer carries out the inspection or work.</p></div>
              <div><b>04</b><h3>Certificate</h3><p>You receive the certificate or report and any next steps.</p></div>
            </div>
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-wrap service-detail-two">
            <div className="service-risk">
              <p className="service-detail-kicker">Safety first</p>
              <h2>Risks of doing it yourself</h2>
              <p>{s.risk}</p>
              <p>Never work on live electrical systems, gas appliances or suspected asbestos-containing materials without the appropriate competence and controls.</p>
            </div>
            <div className="service-why">
              <p className="service-detail-kicker">Why us</p>
              <h2>Local London engineers</h2>
              <p>{s.why}</p>
              <ul>
                <li>Homes, landlords and businesses</li>
                <li>Book several services in one visit</li>
                <li>Prices confirmed before the visit</li>
                <li>Quick replies by phone and WhatsApp</li>
              </ul>
              <VerifyRegistration />
            </div>
          </div>
        </section>

        <section className="service-detail-section service-detail-gallery-section">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">Our work</p>
            <h2>{s.title} gallery</h2>
            <div className="service-detail-gallery">
              {serviceGallery(s.slug).map((src) => (
                <img key={src} src={src} alt={galleryAlt(src)} width={1100} height={600} loading="lazy" />
              ))}
            </div>
          </div>
        </section>

        <section className="service-detail-section service-detail-soft">
          <div className="service-detail-wrap service-faq-wrap">
            <p className="service-detail-kicker">Useful information</p>
            <h2>Frequently asked questions</h2>
            {faqs(s).map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="service-detail-cta">
          <div className="service-detail-wrap">
            <h2>Ready to arrange {s.title}?</h2>
            <p>Send your property details and preferred date, and we will confirm your appointment.</p>
            <a href={book}>Book this service</a>
          </div>
        </section>
      </article>
    </main>
  );
}

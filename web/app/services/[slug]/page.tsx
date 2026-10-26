import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getService, formatPrice, serviceHeroImage, serviceGallery, type Service } from "@/lib/services";
import { site } from "@/lib/site";

// Ported from the original theme's single-eicr_service.php.
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = getService((await params).slug);
  if (!s) return {};
  return {
    title: { absolute: `${s.title} in London | EICR in London` },
    description: s.benefit,
    alternates: { canonical: `/services/${s.slug}/` },
    openGraph: { images: [serviceHeroImage(s.slug)] },
  };
}

function faqs(s: Service) {
  return [
    [`How much does ${s.title} cost?`, `Prices start from ${formatPrice(s.price)}. The final amount depends on the property details and the scope of work, and we confirm it before the visit.`],
    ["Can I combine this with another service?", "Yes. List every service you need in one booking request and we will arrange them together, often in a single visit."],
    ["Which areas do you cover?", "We arrange residential and commercial property-compliance services throughout London and selected areas near the M25."],
    ["What should I prepare before the visit?", "Make sure the relevant areas are accessible and tell us about any access instructions or known issues when you book."],
    ["When will the engineer contact me?", "After confirmation, the attending specialist will contact you before travelling to the property."],
  ];
}

// Structured data so search engines can show the service, price and FAQs.
function schema(s: Service) {
  const url = `${site.url}/services/${s.slug}/`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.title,
      description: s.benefit,
      url,
      areaServed: "London",
      provider: { "@type": "LocalBusiness", name: site.name, url: site.url, telephone: site.phone },
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
  const s = getService((await params).slug);
  if (!s) notFound();
  const book = `/booking/?service=${s.slug}`;

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema(s)) }} />
      <article className="service-detail-page">
        <section className="service-detail-hero">
          <div className="service-detail-wrap service-detail-hero-grid">
            <div>
              <p className="service-detail-kicker">London property compliance service</p>
              <h1>{s.title}</h1>
              <p className="service-detail-lead">{s.benefit}</p>
              <div className="service-detail-price">
                <span className="eicr-current-price">From {formatPrice(s.price)}</span>
              </div>
              <div className="service-detail-actions">
                <a className="service-detail-book" href={book}>Book now</a>
                <a className="service-detail-quote" href={`/request-a-quote/?service=${s.slug}`}>Request a quote</a>
              </div>
            </div>
            <img src={serviceHeroImage(s.slug)} alt={`${s.title} service in London`} />
          </div>
        </section>

        <section className="service-detail-section">
          <div className="service-detail-wrap service-detail-two">
            <div>
              <p className="service-detail-kicker">Service overview</p>
              <h2>Professional {s.title}</h2>
              <div className="service-detail-editor">
                <p>{s.benefit}</p>
                <p>We cover residential and commercial properties throughout London. Send the property details and required scope so the appropriate specialist and appointment can be arranged.</p>
              </div>
            </div>
            <aside className="service-detail-included">
              <h2>What you can expect</h2>
              <ul>
                <li>Clear appointment confirmation</li>
                <li>A suitable specialist for the agreed scope</li>
                <li>Systematic inspection or service work</li>
                <li>Plain-English explanation of key findings</li>
                <li>Digital records where included</li>
                <li>Practical recommendations and next actions</li>
              </ul>
              <a href={book}>Arrange this service</a>
            </aside>
          </div>
        </section>

        <section className="service-detail-section service-detail-soft">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">Simple and organised</p>
            <h2>How the service works</h2>
            <div className="service-process">
              <div><b>01</b><h3>Send your request</h3><p>Tell us the property details and any additional services required.</p></div>
              <div><b>02</b><h3>Confirm access</h3><p>Provide the address, preferred date and useful access information.</p></div>
              <div><b>03</b><h3>Professional visit</h3><p>The appropriate specialist completes the agreed inspection or work.</p></div>
              <div><b>04</b><h3>Receive the outcome</h3><p>Get the relevant report, record or recommendations for next steps.</p></div>
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
              <p className="service-detail-kicker">Why clients choose us</p>
              <h2>London-focused support</h2>
              <p>{s.why}</p>
              <ul>
                <li>Residential and commercial appointments</li>
                <li>Multiple services can be combined in one request</li>
                <li>Clear prices confirmed before the visit</li>
                <li>Responsive booking and customer support</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="service-detail-section service-detail-gallery-section">
          <div className="service-detail-wrap">
            <p className="service-detail-kicker">Our work</p>
            <h2>{s.title} gallery</h2>
            <div className="service-detail-gallery">
              {serviceGallery(s.slug).map((src, i) => (
                <img key={src} src={src} alt={`${s.title} working image ${i + 1}`} loading="lazy" />
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

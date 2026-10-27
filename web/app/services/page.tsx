import type { Metadata } from "next";
import CorePage from "@/components/CorePage";
import { formatPrice } from "@/lib/services";
import { pricedServices } from "@/lib/settings";

export const metadata: Metadata = {
  title: { absolute: "Property Compliance Services in London | EICR in London" },
  description: "Electrical, gas, fire-safety, energy and property-compliance services for residential and commercial properties across London and the M25.",
  alternates: { canonical: "/services/" },
};

export default async function ServicesPage() {
  const services = await pricedServices();
  return (
    <CorePage title="Services">
      <div className="core-page-intro">
        <p>Browse electrical, gas, fire-safety, energy and property-compliance services for residential and commercial properties across London and the M25 area.</p>
      </div>
      <div className="core-service-grid">
        {services.map((s) => (
          <article key={s.slug}>
            <h2>{s.title}</h2>
            <p>{s.benefit}</p>
            <div>
              <strong className="core-price-display">
                <span className="eicr-current-price">From {formatPrice(s.price)}</span>
              </strong>
              <span>
                <a href={`/services/${s.slug}/`}>More details</a>
                <a className="core-book" href={`/booking/?service=${s.slug}`}>Book now</a>
              </span>
            </div>
          </article>
        ))}
      </div>
    </CorePage>
  );
}

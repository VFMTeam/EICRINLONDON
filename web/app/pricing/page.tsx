import type { Metadata } from "next";
import CorePage from "@/components/CorePage";
import { services, formatPrice } from "@/lib/services";

export const metadata: Metadata = {
  title: { absolute: "Property Certificate Prices in London | EICR in London" },
  description: "Clear starting prices for London property inspections, certificates and compliance services.",
  alternates: { canonical: "/pricing/" },
};

export default function PricingPage() {
  return (
    <CorePage title="Pricing">
      <div className="core-page-intro">
        <p>Clear starting prices for London property inspections and certification services. Select a service to view its details or book an appointment.</p>
      </div>
      <div className="core-price-list">
        {services.map((s) => (
          <div key={s.slug}>
            <a href={`/services/${s.slug}/`}>{s.title}</a>
            <strong className="core-price-display">
              <span className="eicr-current-price">From {formatPrice(s.price)}</span>
            </strong>
            <a className="core-book" href={`/booking/?service=${s.slug}`}>Book</a>
          </div>
        ))}
      </div>
    </CorePage>
  );
}

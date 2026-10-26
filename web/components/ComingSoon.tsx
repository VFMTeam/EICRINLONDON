import { site, telHref } from "@/lib/site";

// Placeholder for features still being rebuilt (online booking and customer
// accounts). Visitors can still reach the team straight away.
export default function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <main id="main-content">
      <section className="notice-page">
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="notice-actions">
          <a href="/request-a-quote/">Request a quote</a>
          <a className="secondary" href={telHref}>Call {site.phone}</a>
          <a className="secondary" href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>
        </div>
      </section>
    </main>
  );
}

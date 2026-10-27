import { getSite } from "@/lib/settings";

export default async function NoticePage({ title, text }: { title: string; text: string }) {
  const site = await getSite();
  return (
    <main id="main-content">
      <section className="notice-page">
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="notice-actions">
          <a href="/request-a-quote/">Request a quote</a>
          <a className="secondary" href={site.telHref}>Call {site.phone}</a>
          <a className="secondary" href={`https://wa.me/${site.whatsapp}`}>WhatsApp us</a>
        </div>
      </section>
    </main>
  );
}

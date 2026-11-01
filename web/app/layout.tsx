import type { Metadata, Viewport } from "next";
import { pageMeta } from "@/lib/content";
import { getSettings, getSite, renderPartial } from "@/lib/settings";
import { site } from "@/lib/site";
import { tracking, consentDefaultsScript } from "@/lib/tracking";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: pageMeta.home.title, template: "%s | EICR in London" },
  description: pageMeta.home.description,
  openGraph: { siteName: site.name, locale: "en_GB", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Changes every deploy, so browsers can cache /css and /js for a year.
const v = process.env.ASSET_VERSION;


// Chrome and Edge load a page in the background once a link is hovered, so it opens instantly.
const speculation = JSON.stringify({
  prerender: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          ...["/admin/*", "/api/*", "/booking/*", "/request-a-quote/*", "/review/*"].map((p) => ({ not: { href_matches: p } })),
          { not: { selector_matches: "[target=_blank], [download]" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
});

const localBusiness = (site: Awaited<ReturnType<typeof getSite>>) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  legalName: site.company,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  image: `${site.url}/images/logo.png`,
  address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: "Dagenham", postalCode: "RM10 8PS", addressCountry: "GB" },
  areaServed: "London",
  sameAs: [site.facebook, site.instagram, site.tiktok].filter(Boolean),
});

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { announcement, tracking: saved } = await getSettings();
  const adsId = saved.adsId || tracking.adsId;
  const clientData = { ajax: "/api/forms/", adsId, adsLabel: saved.adsLabel || tracking.adsLabel };
  const site = await getSite();
  const header = await renderPartial("header");
  const footer = (await renderPartial("footer")).replace(/__YEAR__/g, String(new Date().getFullYear()));
  return (
    <html lang="en-GB">
      <head>
        <link rel="stylesheet" href={`/css/site-ui.css?v=${v}`} />
        <link rel="stylesheet" href={`/css/main.css?v=${v}`} />
        <link rel="stylesheet" href={`/css/theme-vars.css?v=${v}`} />
        <link rel="stylesheet" href={`/css/dark.css?v=${v}`} media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/images/favicon.png" />
        <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
        <script dangerouslySetInnerHTML={{ __html: `window.EICR_DATA=${JSON.stringify(clientData)};` }} />
        <script defer src={`/js/main.js?v=${v}`} />
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: speculation }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness(site)) }} />
      </head>
      <body>
        {announcement.enabled && announcement.text && (
          <a className="site-announcement" href={announcement.link}>{announcement.text}</a>
        )}
        <div className="site-shell" dangerouslySetInnerHTML={{ __html: header }} />
        {children}
        <div className="site-shell" dangerouslySetInnerHTML={{ __html: footer }} />
        <CookieConsent gaId={saved.gaId || tracking.gaId} adsId={adsId} />
      </body>
    </html>
  );
}

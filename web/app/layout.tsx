import type { Metadata, Viewport } from "next";
import { readPartial, pageMeta } from "@/lib/content";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: pageMeta.home.title, template: "%s | EICR in London" },
  description: pageMeta.home.description,
  openGraph: { siteName: site.name, locale: "en_GB", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Settings read by public/js/main.js (menus, scroll animations, forms).
const clientData = { ajax: "/api/forms/", stripeKey: "", stripeEnabled: false, colours: {}, adsId: "", adsLabel: "" };

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  email: site.email,
  address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: "Dagenham", addressCountry: "GB" },
  areaServed: "London",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const header = readPartial("header");
  const footer = readPartial("footer").replace(/__YEAR__/g, String(new Date().getFullYear()));
  return (
    <html lang="en-GB">
      <head>
        <link rel="stylesheet" href="/css/site-ui.css" />
        <link rel="stylesheet" href="/css/main.css" />
        <link rel="stylesheet" href="/css/theme-vars.css" />
        <link rel="icon" href="/images/logo.png" />
        <script dangerouslySetInnerHTML={{ __html: `window.EICR_DATA=${JSON.stringify(clientData)};` }} />
        <script defer src="/js/main.js" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      </head>
      <body>
        <div className="site-shell" dangerouslySetInnerHTML={{ __html: header }} />
        {children}
        <div className="site-shell" dangerouslySetInnerHTML={{ __html: footer }} />
      </body>
    </html>
  );
}

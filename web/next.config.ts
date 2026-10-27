import type { NextConfig } from "next";
import { services } from "./lib/services";

// Security headers sent with every page.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")" },
];

const year = "public, max-age=31536000, immutable";
const month = "public, max-age=2592000, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  env: { ASSET_VERSION: (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 8) },
  // Keep the same URLs as the old WordPress site (e.g. /about/), so Google
  // rankings and existing links carry over.
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/css/:file*", headers: [{ key: "Cache-Control", value: year }] },
      { source: "/js/:file*", headers: [{ key: "Cache-Control", value: year }] },
      { source: "/images/:file*", headers: [{ key: "Cache-Control", value: month }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  async redirects() {
    return [
      // Old WordPress service URLs such as /eicr-certificate/.
      ...services.map((s) => ({ source: `/${s.slug}/`, destination: `/services/${s.slug}/`, permanent: true })),
      { source: "/service/:slug/", destination: "/services/:slug/", permanent: true },
      { source: "/sitemap.xml/", destination: "/sitemap.xml", permanent: true },
      // The old site's customer and staff login pages no longer exist.
      ...["sign-in", "create-account", "reset-password", "my-account", "staff-login", "staff-verify", "staff-dashboard"].map((p) => ({
        source: `/${p}/`,
        destination: "/contact/",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;

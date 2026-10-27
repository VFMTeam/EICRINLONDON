import { site } from "@/lib/site";

export const verifyHtml = `<details class="trust-verify"><summary>Verify our registration</summary><p>NICEIC: ${site.company}, ${site.niceic}. <a href="https://www.niceic.com/find-a-contractor" target="_blank" rel="noopener">Check on the NICEIC register</a></p></details>`;

const logos: [string, string][] = [
  ["niceic-approved.webp", "NICEIC Approved Contractor"],
  ["gas-safe-register.webp", "Gas Safe Register"],
  ["napit-approved.webp", "NAPIT Approved"],
  ["trustmark-approved.webp", "TrustMark"],
  ["elmhurst-energy-approved.webp", "Elmhurst Energy"],
  ["city-and-guilds.webp", "City & Guilds"],
];
const logoSet = (hidden: boolean) =>
  `<div class="logo-marquee-set"${hidden ? ' aria-hidden="true"' : ""}>${logos
    .map(([file, alt]) => `<img src="/images/${file}" alt="${hidden ? "" : alt.replace("&", "&amp;")}" width="150" height="150" loading="lazy">`)
    .join("")}</div>`;

// Accreditation logos scroll in a loop, like the reviews.
export const logosHtml = `<div class="logo-viewport"><div class="logo-marquee">${logoSet(false)}${logoSet(true)}</div></div>`;

export default function VerifyRegistration() {
  return <div dangerouslySetInnerHTML={{ __html: verifyHtml }} />;
}

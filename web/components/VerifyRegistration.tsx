import { site } from "@/lib/site";

const logos: [string, string][] = [
  ["niceic-approved.webp", "NICEIC Approved Contractor"],
  ["gas-safe-register.webp", "Gas Safe Register"],
  ["napit-approved.webp", "NAPIT Approved"],
  ["trustmark-approved.webp", "TrustMark"],
  ["elmhurst-energy-approved.webp", "Elmhurst Energy"],
  ["city-and-guilds.webp", "City & Guilds"],
];

const logo = (file: string, alt: string, hidden: boolean) => {
  const img = `<img src="/images/${file}" alt="${hidden ? "" : alt.replace("&", "&amp;")}" width="150" height="150" loading="lazy">`;
  if (file !== "niceic-approved.webp") return img;
  return `<button type="button" class="logo-niceic" aria-controls="niceic-verify" aria-expanded="false"${hidden ? ' tabindex="-1"' : ""}>${img}<span class="logo-tip" aria-hidden="true">Verify this</span></button>`;
};

const logoSet = (hidden: boolean) =>
  `<div class="logo-marquee-set"${hidden ? ' aria-hidden="true"' : ""}>${logos.map(([file, alt]) => logo(file, alt, hidden)).join("")}</div>`;

// Accreditation logos scroll in a loop, like the reviews.
export const logosHtml = `<div class="logo-strip"><div class="logo-viewport"><div class="logo-marquee">${logoSet(false)}${logoSet(true)}</div></div><div class="logo-verify" id="niceic-verify"><div><p><strong>NICEIC Approved Contractor</strong>${site.company}<br>Registration no. ${site.niceic}</p><a href="https://www.niceic.com/find-a-contractor" target="_blank" rel="noopener">Check on the NICEIC register</a></div></div></div>`;

export default function VerifyRegistration() {
  return <div dangerouslySetInnerHTML={{ __html: logosHtml }} />;
}

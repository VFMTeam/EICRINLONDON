import { site } from "@/lib/site";

export const verifyHtml = `<details class="trust-verify"><summary>Verify our registration</summary><p>NICEIC: ${site.company}, ${site.niceic}. <a href="https://www.niceic.com/find-a-contractor" target="_blank" rel="noopener">Check on the NICEIC register</a></p></details>`;

export default function VerifyRegistration() {
  return <div dangerouslySetInnerHTML={{ __html: verifyHtml }} />;
}

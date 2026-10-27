"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cookie banner with Google Consent Mode v2. Google tags load only after the
// visitor accepts analytics or advertising, as UK PECR/GDPR requires. The
// "Cookie settings" link in the footer reopens it.

type Choice = { analytics: boolean; ads: boolean };

const COOKIE = "eicr_consent";
const MAX_AGE = 60 * 60 * 24 * 180; // ask again after 6 months

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readChoice(): Choice | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
    return { analytics: !!v.analytics, ads: !!v.ads };
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(JSON.stringify({ v: 1, ...choice, ts: Date.now() }));
  document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

// Remove Google cookies that were set before consent was withdrawn.
function clearGoogleCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (!/^(_ga|_gid|_gat|_gcl)/.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ""}`;
  }
}

let tagsLoaded = false;
function loadGoogleTags(gaId: string, adsId: string) {
  if (tagsLoaded || (!gaId && !adsId) || !window.gtag) return;
  tagsLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId || adsId)}`;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  if (gaId) window.gtag("config", gaId);
  if (adsId) window.gtag("config", adsId);
}

function applyChoice(choice: Choice, gaId: string, adsId: string) {
  const g = (on: boolean) => (on ? "granted" : "denied");
  window.gtag?.("consent", "update", {
    analytics_storage: g(choice.analytics),
    ad_storage: g(choice.ads),
    ad_user_data: g(choice.ads),
    ad_personalization: g(choice.ads),
  });
  if (choice.analytics || choice.ads) loadGoogleTags(gaId, adsId);
  if (!choice.analytics && !choice.ads) clearGoogleCookies();
}

export default function CookieConsent({ gaId, adsId }: { gaId: string; adsId: string }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, ads: false });
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = readChoice();
    if (saved) {
      setChoice(saved);
      applyChoice(saved, gaId, adsId);
    } else if (gaId || adsId) {
      setOpen(true);
    }
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest("[data-cookie-settings]");
      if (!link) return;
      e.preventDefault();
      setChoice(readChoice() ?? { analytics: false, ads: false });
      setDetails(true);
      setOpen(true);
      setTimeout(() => panel.current?.focus(), 30);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [gaId, adsId]);

  const decide = useCallback(
    (c: Choice) => {
      saveChoice(c);
      setChoice(c);
      applyChoice(c, gaId, adsId);
      setOpen(false);
      setDetails(false);
    },
    [gaId, adsId],
  );

  if (!open) return null;

  return (
    <div className="eicr-cookie" role="dialog" aria-labelledby="eicr-cookie-title" aria-describedby="eicr-cookie-text" tabIndex={-1} ref={panel}>
      <h2 id="eicr-cookie-title">Cookies</h2>
      <p id="eicr-cookie-text">
        We use essential cookies to run this site. With your OK, we also use Google cookies to see how the site is used. <a href="/cookies/">Cookie policy</a>
      </p>

      {details && (
        <div className="eicr-cookie-options">
          <label className="eicr-cookie-option">
            <span>
              <b>Essential</b>
              <small>Security, forms, bookings and remembering this choice. Always on.</small>
            </span>
            <input type="checkbox" checked disabled />
          </label>
          <label className="eicr-cookie-option">
            <span>
              <b>Analytics</b>
              <small>Google Analytics: which pages are visited and how the site performs.</small>
            </span>
            <input type="checkbox" checked={choice.analytics} onChange={(e) => setChoice({ ...choice, analytics: e.target.checked })} />
          </label>
          {adsId && (
            <label className="eicr-cookie-option">
              <span>
                <b>Advertising</b>
                <small>Google Ads: measures which adverts lead to enquiries and bookings.</small>
              </span>
              <input type="checkbox" checked={choice.ads} onChange={(e) => setChoice({ ...choice, ads: e.target.checked })} />
            </label>
          )}
        </div>
      )}

      {/* Reject and Accept get equal weight, as the UK ICO expects. */}
      <div className="eicr-cookie-actions">
        <button type="button" className="eicr-cookie-btn eicr-cookie-reject" onClick={() => decide({ analytics: false, ads: false })}>
          Reject all
        </button>
        <button type="button" className="eicr-cookie-btn eicr-cookie-accept" onClick={() => decide({ analytics: true, ads: true })}>
          Accept all
        </button>
        {details ? (
          <button type="button" className="eicr-cookie-btn eicr-cookie-wide" onClick={() => decide(choice)}>
            Save my choices
          </button>
        ) : (
          <button type="button" className="eicr-cookie-btn eicr-cookie-wide eicr-cookie-link" onClick={() => setDetails(true)}>
            Manage choices
          </button>
        )}
      </div>
    </div>
  );
}

// Google Analytics and Google Ads IDs. Leave them unset and no tracking code
// loads at all. Even when set, nothing loads until the visitor accepts the
// matching cookie category in the cookie banner.
export const tracking = {
  gaId: process.env.NEXT_PUBLIC_GA_ID ?? "", // e.g. G-XXXXXXXXXX
  adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "", // e.g. AW-123456789
  adsLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL ?? "", // conversion label for quote/booking leads
};

// Google Consent Mode v2: everything optional starts as "denied" before any
// Google tag runs. CookieConsent.tsx updates it once the visitor chooses.
export const consentDefaultsScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted'});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);`;

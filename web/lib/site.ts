// Business details shown across the site. Edit here and every page updates.
export const site = {
  name: "EICR in London",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eicrinlondon.co.uk",
  phone: "+44 7878 655350",
  email: "info@eicrinlondon.co.uk",
  whatsapp: "447878655350",
  address: "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS",
};

export const telHref = `tel:${site.phone.replace(/[^0-9+]/g, "")}`;

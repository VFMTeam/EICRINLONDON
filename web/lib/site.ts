// Business details shown across the site. Edit here and every page updates.
export const site = {
  name: "EICR in London",
  company: "Group Tech Solutions UK Ltd",
  niceic: "D612270",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eicrinlondon.co.uk",
  phone: "07878 655350",
  email: "info@eicrinlondon.co.uk",
  whatsapp: "447878655350",
  address: "Unit 16, Office 2, Midas Business Centre, Wantz Road, Dagenham, RM10 8PS",
};

export const telHref = `tel:+44${site.phone.replace(/\D/g, "").slice(1)}`;

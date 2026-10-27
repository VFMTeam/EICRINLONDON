// Landlord guides shown at /guides/<slug>/. Rules are for England.
export type Guide = {
  slug: string;
  title: string;
  description: string;
  service: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export const guides: Guide[] = [
  {
    slug: "landlord-eicr-rules",
    title: "EICR Rules for Landlords in England",
    description: "How often a rental needs an EICR, who gets a copy, the deadlines for repairs and the fines for missing them.",
    service: "eicr-certificate",
    sections: [
      {
        heading: "How often you need one",
        paragraphs: [
          "Under the Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020, a private landlord must have the electrical installation inspected and tested at least every five years by a qualified person.",
          "If the last report gives a shorter date, for example because the wiring is old, the next inspection is due on that date instead.",
        ],
      },
      {
        heading: "Who gets a copy",
        paragraphs: [
          "Existing tenants must get a copy within 28 days of the inspection. A new tenant must get a copy before they move in, and a prospective tenant within 28 days of asking for one.",
          "If the local council asks for the report, you have 7 days to send it.",
        ],
      },
      {
        heading: "If the report is unsatisfactory",
        paragraphs: [
          "A report with any C1, C2 or FI code is unsatisfactory. You then have 28 days, or less if the report says so, to have the remedial work or further investigation done.",
          "Once the work is finished, send written confirmation to the tenants and the council within 28 days.",
        ],
      },
      {
        heading: "Fines",
        paragraphs: ["Councils can fine a landlord up to £30,000 for each breach of these rules."],
      },
    ],
  },
  {
    slug: "eicr-codes-explained",
    title: "EICR Codes Explained: C1, C2, C3 and FI",
    description: "What each observation code on an electrical report means and which ones make the report unsatisfactory.",
    service: "eicr-certificate",
    sections: [
      {
        heading: "C1: Danger present",
        paragraphs: ["There is a risk of injury right now, such as exposed live parts. The engineer will usually make it safe before leaving. The report is unsatisfactory."],
      },
      {
        heading: "C2: Potentially dangerous",
        paragraphs: ["Not dangerous this minute, but it could become dangerous, for example a missing earth or a damaged socket. It needs fixing as soon as possible. The report is unsatisfactory."],
      },
      {
        heading: "FI: Further investigation",
        paragraphs: ["The engineer found something that needs more time to check, such as a circuit that could not be traced. The report is unsatisfactory until it is investigated."],
      },
      {
        heading: "C3: Improvement recommended",
        paragraphs: ["The installation does not meet the current wiring regulations but is not unsafe. A report with only C3 codes is still satisfactory, and you do not have to act on them."],
      },
      {
        heading: "What to do next",
        paragraphs: ["Ask for a quote for the C1, C2 and FI items. Once the work is done you get a certificate for the repairs, which you keep with the EICR."],
      },
    ],
  },
  {
    slug: "landlord-gas-safety-rules",
    title: "Gas Safety Certificate Rules for Landlords",
    description: "Yearly gas safety checks, who can do them, the tenant copy deadline and how long to keep records.",
    service: "gas-safety",
    sections: [
      {
        heading: "Every 12 months",
        paragraphs: [
          "The Gas Safety (Installation and Use) Regulations 1998 require landlords to have every gas appliance, fitting and flue they provide checked every 12 months by a Gas Safe registered engineer.",
          "You can have the check done up to two months before the due date and keep the original expiry date, so you do not lose any time.",
        ],
      },
      {
        heading: "Copies and records",
        paragraphs: [
          "Existing tenants must get a copy of the gas safety record within 28 days of the check. New tenants must get one before they move in.",
          "Keep each record for at least two years.",
        ],
      },
      {
        heading: "What is covered",
        paragraphs: ["The check covers appliances you supply, such as the boiler, hob, cooker and gas fire. Appliances the tenant owns are their responsibility, but the pipework and flues serving them are still yours."],
      },
      {
        heading: "Boiler service",
        paragraphs: ["A gas safety check is not a boiler service. Many landlords book both in one visit so the boiler is kept in good order too."],
      },
    ],
  },
  {
    slug: "epc-rules-for-landlords",
    title: "EPC Rules for Rental Properties",
    description: "The minimum EPC rating for letting a property, how long an EPC lasts and when you need a new one.",
    service: "epc",
    sections: [
      {
        heading: "Minimum rating E",
        paragraphs: [
          "Under the Minimum Energy Efficiency Standard, a privately rented home in England must have an EPC rating of E or above, unless a valid exemption is registered.",
          "Fines for letting a property below the minimum can reach £5,000.",
        ],
      },
      {
        heading: "When you need one",
        paragraphs: ["You need a valid EPC before you market a property to let or sell. Give a copy to the tenant at the start of the tenancy."],
      },
      {
        heading: "How long it lasts",
        paragraphs: ["An EPC is valid for 10 years. If yours has expired, you need a new one before you start a new tenancy."],
      },
      {
        heading: "Future changes",
        paragraphs: ["The government has proposed raising the minimum for rentals to C by 2030. If your rating is D or E, the EPC recommendations show which improvements would make the biggest difference."],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}

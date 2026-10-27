// Page copy for the main service pages. Services without an entry use the
// shared template text.
export type ServiceDetail = {
  h1: string;
  title: string;
  description: string;
  intro: string[];
  checks: string[];
  faqs: [string, string][];
};

export const serviceDetails: Record<string, ServiceDetail> = {
  "eicr-certificate": {
    h1: "EICR Certificate in London",
    title: "EICR Certificate London | NICEIC Registered | EICR in London",
    description: "Landlord and homeowner EICRs across London by NICEIC registered electricians. Fixed prices by bedroom. Report sent by email.",
    intro: [
      "An Electrical Installation Condition Report (EICR) checks the fixed wiring in a property and tells you whether it is safe to keep using. Our electricians are NICEIC registered.",
      "Private landlords in England need an EICR at least every five years, and before a new tenancy if the last one has expired. Homeowners are advised to have one every ten years, or when buying or selling.",
    ],
    checks: [
      "Consumer unit (fuse box), circuit breakers and RCDs",
      "Earthing and bonding to gas and water pipes",
      "Sockets, switches and light fittings, room by room",
      "Insulation resistance and earth fault loop tests on every circuit",
      "Signs of overheating, damage or DIY wiring",
    ],
    faqs: [
      ["How long does an EICR take?", "Most flats take two to three hours. Larger houses and HMOs take longer. The power is switched off for short periods during testing."],
      ["What happens if the EICR is unsatisfactory?", "Any C1, C2 or FI code makes the report unsatisfactory. Landlords then have 28 days to get the work done. We give you a fixed quote for the repairs and a certificate once they are finished."],
      ["What do C1, C2, C3 and FI mean?", "C1 is danger present, C2 is potentially dangerous, FI needs further investigation and C3 is an improvement that is recommended but not required. Our guide explains each one."],
      ["Do I need to be at the property?", "No. The tenant or your letting agent can let the engineer in. We send the report to you, and to the agent if you ask."],
    ],
  },
  "gas-safety": {
    h1: "Gas Safety Certificate in London",
    title: "Gas Safety Certificate London (CP12) | EICR in London",
    description: "Landlord gas safety certificates (CP12) across London by Gas Safe registered engineers. Up to two appliances.",
    intro: [
      "A landlord gas safety certificate, often called a CP12, records that each gas appliance, pipe and flue in a rented property has been checked by a Gas Safe registered engineer.",
      "Landlords need a new one every 12 months. Tenants must get a copy within 28 days of the check, and new tenants before they move in.",
    ],
    checks: [
      "Gas tightness test on the installation pipework",
      "Burner pressure or gas rate on each appliance",
      "Flue flow and spillage tests on the boiler and any gas fire",
      "Ventilation and safety devices",
      "The emergency control valve is easy to reach and works",
    ],
    faqs: [
      ["How long does a gas safety check take?", "Usually 30 to 60 minutes for a boiler and a hob. Each extra appliance adds a little time."],
      ["Can I have the check done early?", "Yes. A check carried out up to two months before the due date keeps the original expiry date."],
      ["What if an appliance fails?", "The engineer explains the fault and, if it is unsafe, turns it off with your permission. We can quote for the repair, and the record is updated once it is fixed."],
      ["Is a boiler service included?", "No, the gas safety check is a safety inspection. You can add a boiler service in the same visit with our combined price."],
    ],
  },
  epc: {
    h1: "EPC in London",
    title: "EPC London | Energy Performance Certificate | EICR in London",
    description: "Energy Performance Certificates for London rentals and sales by accredited assessors. Priced by bedrooms. Lodged on the national register.",
    intro: [
      "An Energy Performance Certificate (EPC) rates a property from A to G and lists improvements that would lower the bills. You need one before you let or sell a home.",
      "A rented home in England must be rated E or above. An EPC lasts 10 years and is lodged on the national register, so your agent can look it up straight away.",
    ],
    checks: [
      "Room sizes and the age and type of construction",
      "Loft, wall and floor insulation",
      "Windows and glazing",
      "Boiler, heating controls and hot water",
      "Lighting and any renewables such as solar panels",
    ],
    faqs: [
      ["How long does an EPC visit take?", "Around 45 minutes for a flat and up to an hour and a half for a large house."],
      ["My rating is F or G. What now?", "The property cannot be let until it reaches E, unless an exemption is registered. The EPC lists the improvements that would make the biggest difference."],
      ["How long is an EPC valid?", "10 years. You only need a new one when it has expired and you start a new tenancy or sale."],
    ],
  },
  "fire-risk": {
    h1: "Fire Risk Assessment in London",
    title: "Fire Risk Assessment London | HMOs, Flats & Businesses | EICR in London",
    description: "Written fire risk assessments for HMOs, blocks of flats, shops and offices across London.",
    intro: [
      "Under the Regulatory Reform (Fire Safety) Order 2005, a fire risk assessment is required for workplaces, HMOs and the shared parts of blocks of flats.",
      "Our assessor walks the building, records the risks and gives you a written report with a clear action plan, so you know what to fix first.",
    ],
    checks: [
      "Fire alarms, smoke detectors and emergency lighting",
      "Escape routes, fire doors and signage",
      "Sources of ignition and stored materials",
      "Fire extinguishers and fire blankets",
      "Who is at risk, including anyone who needs help to get out",
    ],
    faqs: [
      ["Does a single-let house need a fire risk assessment?", "A house let to one household does not need a formal assessment, but it must have working smoke alarms on every storey and a carbon monoxide alarm where there is a fixed combustion appliance."],
      ["How often should it be reviewed?", "Whenever the building or its use changes, and as a rule every year for HMOs and blocks of flats."],
      ["What do I get?", "A written report with the findings, a risk rating and a list of actions in order of priority."],
    ],
  },
  "pat-testing": {
    h1: "PAT Testing in London",
    title: "PAT Testing London | Landlords & Businesses | EICR in London",
    description: "PAT testing for rentals, HMOs, offices and shops across London. First ten appliances included. Labels and certificate provided.",
    intro: [
      "PAT testing checks portable electrical appliances such as kettles, heaters and washing machines. Each item gets a pass or fail label and goes on your test record.",
      "There is no fixed legal interval, but landlords must make sure any appliance they supply is safe, and many HMO licences ask for a PAT record.",
    ],
    checks: [
      "Visual check of the plug, cable and casing",
      "Earth continuity and insulation tests",
      "Correct fuse rating in the plug",
      "A pass or fail label on every item",
      "A full list of tested appliances for your records",
    ],
    faqs: [
      ["How often should PAT testing be done?", "Most landlords test at the start of each tenancy or once a year. Offices and shops usually test every one to two years."],
      ["What happens to items that fail?", "They are labelled as failed and taken out of use. We tell you which can be repaired."],
      ["Do I need PAT testing for an unfurnished let?", "Only for appliances you supply, such as a fridge or washing machine. The tenant's own items are not included."],
    ],
  },
};

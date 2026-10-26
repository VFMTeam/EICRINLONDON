// Service catalogue, ported from the WordPress theme (inc/service-catalog.php).
// Prices are residential starting prices in GBP.
export type Service = {
  slug: string;
  title: string;
  price: number;
  benefit: string;
  risk: string;
  why: string;
};

const rows: [string, string, number, string, string, string][] = [
  ["eicr-certificate", "EICR – Electrical Certificate", 79, "Checks the safety and condition of fixed electrical installations and provides a clear coded report.", "Testing live circuits without the correct equipment and isolation procedure can cause electric shock, fire or hidden faults.", "A scope-matched electrical professional tests, records and explains the findings, then advises on proportionate remedial work."],
  ["pat-testing", "PAT Testing", 59, "Helps identify damaged or unsafe portable electrical appliances and provides an organised test record.", "A visual-only DIY check cannot verify earth continuity, insulation resistance or equipment class.", "We use suitable calibrated equipment and label and document tested appliances clearly."],
  ["fuse-box-installation", "Fuse Box Installation & Replacement", 350, "Modern consumer units can improve circuit protection and make faults easier to isolate.", "Incorrect installation can leave circuits unprotected, create overheating and breach electrical safety requirements.", "Our electrician assesses the existing installation, selects suitable protection and completes the required testing."],
  ["fire-safety-certificate", "Fire Safety Certificate", 79, "Provides documented checks of relevant fire-safety provisions for the property and intended use.", "Missing or incorrectly positioned equipment may fail during an emergency and expose occupants to avoidable risk.", "We inspect the agreed scope, record defects and provide practical next actions."],
  ["fire-risk", "Fire Risk Assessment (FRA)", 79, "Identifies fire hazards, people at risk and reasonable control measures for homes, blocks and workplaces.", "A generic checklist can miss building-specific escape, compartmentation, alarm and management issues.", "Our assessor reviews the premises systematically and produces an actionable report."],
  ["fire-alarm-installation", "Fire Alarm Installation", 149, "A properly designed and installed alarm system improves early warning and evacuation time.", "Wrong detector types, spacing or wiring can create blind spots and nuisance alarms.", "We match the system to the property, install carefully and test operation before handover."],
  ["fire-alarm-certificate", "Fire Alarm Certificate", 79, "Documents inspection and functional testing of the alarm system within the agreed scope.", "Pressing a test button alone does not confirm every device, circuit and control function is satisfactory.", "We carry out structured checks and record observations for the responsible person."],
  ["emergency-lighting", "Emergency Lighting Certificate", 59, "Confirms functional checks of emergency lighting that supports safe escape when normal power fails.", "A lamp may appear operational but have inadequate battery duration, coverage or maintenance history.", "We test the installed system and provide a clear record of defects and recommendations."],
  ["emergency-lighting-installation", "Emergency Lighting Installation", 149, "Provides dedicated backup illumination for escape routes and key safety points.", "Poor placement, unsuitable fittings or incorrect wiring can leave dark areas during an outage.", "We plan the agreed coverage, install suitable fittings and test the completed work."],
  ["emergency-lighting-replacement", "Emergency Lighting Replacement", 85, "Replaces failed, damaged or obsolete emergency fittings to restore dependable coverage.", "Working on lighting circuits without safe isolation risks shock and may damage the emergency supply arrangement.", "Our engineer confirms compatibility, replaces the fitting and checks operation."],
  ["fire-door-survey", "Fire Door Survey", 149, "Assesses fire doors, frames, gaps, seals, hardware and visible condition across the agreed area.", "Small defects can compromise performance and are easy to miss without a consistent inspection method.", "We provide door-by-door findings and prioritised remedial recommendations."],
  ["fire-door-inspection", "Fire Door Inspection", 79, "Supports routine monitoring of fire-door condition and operation.", "DIY inspection may overlook excessive gaps, damaged seals, unsuitable hinges or closing faults.", "Our inspector records defects consistently so maintenance decisions are traceable."],
  ["fire-door-installation", "Fire Door Installation", 350, "Correct installation helps the complete doorset perform as intended in a fire.", "A certified leaf can still fail if the frame, gaps, seals, ironmongery or fixing method is wrong.", "We install to the agreed specification and document the completed work."],
  ["gas-safety", "Gas Safety Certificate", 69, "Checks relevant gas appliances and safety controls and provides a landlord gas-safety record where applicable.", "Unqualified gas work can cause gas leaks, fire, explosion or carbon-monoxide poisoning.", "Gas work is allocated to a suitably registered engineer who carries out the required checks and records."],
  ["boiler-service", "Boiler Service", 89, "Routine servicing supports safe operation, efficiency and early identification of developing faults.", "Opening or adjusting a gas boiler without competence can create combustion and carbon-monoxide hazards.", "A suitable engineer follows the appliance checks and explains any recommended repair."],
  ["boiler-gas-safety-combo", "Boiler Service + Gas Safety Certificate (2 Appliances)", 149, "Combines boiler maintenance and landlord gas-safety checks in one coordinated visit.", "Skipping either maintenance or statutory safety checks can leave faults undiscovered and records incomplete.", "One organised appointment reduces disruption and produces clear service documentation."],
  ["gas-repairs", "Gas Repairs", 95, "Diagnoses and repairs agreed gas-appliance or installation faults safely.", "DIY gas repair is dangerous and may be unlawful where competent registration is required.", "We allocate suitable expertise, investigate the fault and quote for necessary parts or additional work."],
  ["boiler-installation", "Boiler Installation", 999, "A correctly sized and commissioned boiler supports dependable heating and hot water.", "Incorrect sizing, flue work, gas rate or controls can reduce safety, efficiency and reliability.", "A suitable installer surveys, installs, commissions and explains the new system."],
  ["epc", "Energy Performance Certificate", 89, "Provides the property energy rating and practical recommendations for improving energy performance.", "An EPC requires approved assessment methodology and cannot be created from a casual DIY estimate.", "Our assessor gathers the required property evidence and lodges the certificate through the appropriate process."],
  ["asbestos-survey", "Asbestos Survey", 249, "Identifies suspected asbestos-containing materials and helps plan safe management or further analysis.", "Disturbing unknown material can release hazardous fibres that are not visible to the eye.", "A competent surveyor follows a controlled inspection scope and documents locations and recommendations."],
  ["health-safety-service", "Health & Safety Service", 149, "Helps property managers identify hazards, responsibilities and sensible improvement actions.", "Generic online templates may not reflect the actual premises, activities or vulnerable people.", "We tailor the review to the agreed property scope and produce usable actions."],
  ["gas-electrical-installations", "Gas & Electrical Installations", 350, "Coordinates specialist installation work with appropriate testing and handover records.", "Gas and electrical systems involve high-consequence risks and should not be improvised.", "We allocate the relevant trade, define the scope and document completion."],
  ["smoke-detector-certificate", "Smoke Detector Certificate", 59, "Documents checks of smoke detection devices within the agreed property scope.", "A beep from one alarm does not establish correct siting, interconnection, age or coverage.", "We check devices systematically and record any required replacement or improvement."],
  ["fire-extinguisher-check", "Fire Extinguisher Check", 59, "Supports routine verification of extinguisher location, condition, access and service status.", "An unsuitable, discharged or expired extinguisher may provide false confidence in an emergency.", "We inspect the agreed equipment and clearly identify actions or specialist servicing needs."],
  ["commercial-eicr", "Commercial EICR", 345, "Provides structured electrical-condition reporting for commercial premises and operational planning.", "Commercial distribution systems are complex and unsafe to test without suitable competence and coordination.", "We plan access and isolation, test the agreed installation and issue a clear report."],
  ["electrical-repairs", "Electrical Repairs & Fault Finding", 85, "Finds the cause of electrical faults and restores safe operation where possible.", "Repeatedly resetting protection or replacing parts blindly can worsen overheating and shock risks.", "Our electrician tests methodically, explains the fault and records the completed repair."],
  ["emergency-electrician", "Emergency Electrician", 85, "Provides urgent assessment for loss of power, burning smells, tripping or other electrical danger signs.", "Touching damaged equipment or bypassing protection can turn a fault into a fire or serious injury.", "We prioritise making the situation safe, diagnose the cause and explain next steps."],
];

export const services: Service[] = rows.map(([slug, title, price, benefit, risk, why]) => ({ slug, title, price, benefit, risk, why }));

export function getService(slug: string) {
  return services.find((s) => s.slug === slug);
}

export function formatPrice(price: number) {
  return `£${price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Hero image for a service page; mirrors single-eicr_service.php.
const heroImages: Record<string, string> = {
  "eicr-certificate": "eicr-certificate-closeup.webp",
  "commercial-eicr": "commercial-eicr-certificate-closeup.webp",
  "gas-safety": "gas-safety-certificate-closeup.webp",
  epc: "epc-energy-performance-certificate-closeup.webp",
  "fire-risk": "fire-risk-assessment-closeup.webp",
  "emergency-lighting": "emergency-lighting-certificate-closeup.webp",
  "asbestos-survey": "asbestos-survey-closeup.webp",
  "boiler-service": "boiler-service-maintenance-closeup.webp",
  "electrical-repairs": "electrical-repairs-fault-finding-closeup.webp",
};

const imagesWithCloseup = new Set([
  "boiler-installation", "emergency-electrician", "emergency-lighting-installation",
  "emergency-lighting-replacement", "fire-alarm-certificate", "fire-alarm-installation", "fire-door-inspection",
  "fire-door-installation", "fire-door-survey", "fire-safety-certificate", "fuse-box-installation",
  "gas-electrical-installations", "gas-repairs", "pat-testing",
]);

export function serviceHeroImage(slug: string) {
  if (heroImages[slug]) return `/images/${heroImages[slug]}`;
  if (imagesWithCloseup.has(slug)) return `/images/${slug}-closeup.webp`;
  return "/images/gas-electrical-installations-closeup.webp";
}

export function serviceGallery(slug: string) {
  const group =
    slug.includes("fire") || slug.includes("emergency")
      ? ["fire-risk-assessment-closeup.webp", "fire-alarm-certificate-closeup.webp", "emergency-lighting-certificate-closeup.webp"]
      : slug.includes("gas") || slug.includes("boiler")
        ? ["gas-safety-certificate-closeup.webp", "boiler-service-maintenance-closeup.webp", "gas-repairs-closeup.webp"]
        : slug.includes("asbestos") || slug === "epc"
          ? ["asbestos-survey-closeup.webp", "epc-energy-performance-certificate-closeup.webp", "property-safety-engineers.jpg"]
          : ["eicr-certificate-closeup.webp", "pat-testing-closeup.webp", "fuse-box-installation-closeup.webp"];
  return group.map((img) => `/images/${img}`);
}

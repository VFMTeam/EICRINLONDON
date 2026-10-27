// London boroughs we cover, used for the /areas/<slug>/ pages.
export type Area = {
  slug: string;
  name: string;
  region: "Central" | "North" | "East" | "South" | "West";
  postcodes: string[];
  places: string[];
  nearby: string[];
};

const rows: [string, string, Area["region"], string, string, string][] = [
  ["city-of-london", "City of London", "Central", "EC1, EC2, EC3, EC4", "Barbican, Bank, Moorgate, Aldgate, Blackfriars", "islington, tower-hamlets, westminster, southwark"],
  ["westminster", "Westminster", "Central", "W1, W2, W9, SW1, NW8, WC2", "Mayfair, Marylebone, Soho, Pimlico, Paddington, Maida Vale", "camden, kensington-and-chelsea, city-of-london, lambeth"],
  ["camden", "Camden", "Central", "NW1, NW3, NW5, NW6, WC1, N6", "Camden Town, Kentish Town, Hampstead, Kilburn, Holborn", "islington, westminster, barnet, haringey, brent"],
  ["islington", "Islington", "Central", "N1, N4, N5, N7, N19, EC1", "Angel, Highbury, Holloway, Archway, Clerkenwell", "camden, hackney, haringey, city-of-london"],
  ["kensington-and-chelsea", "Kensington and Chelsea", "Central", "SW3, SW5, SW7, SW10, W8, W10, W11", "Chelsea, Earl's Court, South Kensington, Notting Hill, North Kensington", "westminster, hammersmith-and-fulham, wandsworth"],
  ["lambeth", "Lambeth", "Central", "SE1, SE11, SE27, SW2, SW4, SW8, SW9, SW16", "Brixton, Clapham, Stockwell, Vauxhall, Streatham, West Norwood", "southwark, wandsworth, westminster, croydon"],
  ["southwark", "Southwark", "Central", "SE1, SE5, SE15, SE16, SE17, SE22", "Bermondsey, Peckham, Camberwell, Walworth, Rotherhithe, East Dulwich", "lambeth, lewisham, city-of-london, tower-hamlets"],
  ["barnet", "Barnet", "North", "N2, N3, N11, N12, N20, NW4, NW7, NW11, EN4, EN5", "Finchley, Hendon, Golders Green, Edgware, Mill Hill, High Barnet", "enfield, haringey, camden, brent, harrow"],
  ["brent", "Brent", "North", "NW2, NW6, NW9, NW10, HA0, HA9", "Wembley, Willesden, Kilburn, Harlesden, Neasden", "harrow, barnet, camden, ealing"],
  ["enfield", "Enfield", "North", "N9, N13, N14, N18, N21, EN1, EN2, EN3", "Enfield Town, Edmonton, Southgate, Palmers Green, Ponders End", "barnet, haringey, waltham-forest"],
  ["haringey", "Haringey", "North", "N4, N8, N10, N15, N17, N22", "Tottenham, Wood Green, Hornsey, Crouch End, Muswell Hill", "enfield, islington, barnet, waltham-forest, hackney"],
  ["harrow", "Harrow", "North", "HA1, HA2, HA3, HA5, HA7", "Harrow on the Hill, Wealdstone, Stanmore, Pinner, Kenton", "brent, barnet, hillingdon, ealing"],
  ["waltham-forest", "Waltham Forest", "North", "E4, E10, E11, E17", "Walthamstow, Leyton, Leytonstone, Chingford", "enfield, haringey, hackney, newham, redbridge"],
  ["barking-and-dagenham", "Barking and Dagenham", "East", "IG11, RM8, RM9, RM10", "Barking, Dagenham, Becontree, Chadwell Heath", "havering, redbridge, newham"],
  ["bexley", "Bexley", "East", "DA5, DA6, DA7, DA8, DA14, DA15, DA16, SE2, SE28", "Bexleyheath, Sidcup, Erith, Welling, Crayford", "greenwich, bromley"],
  ["greenwich", "Greenwich", "East", "SE3, SE7, SE9, SE10, SE18, SE28", "Greenwich, Woolwich, Eltham, Charlton, Thamesmead", "lewisham, bexley, bromley, tower-hamlets"],
  ["hackney", "Hackney", "East", "E2, E5, E8, E9, N1, N16", "Dalston, Stoke Newington, Hackney Central, Homerton, Hoxton, Clapton", "islington, tower-hamlets, haringey, waltham-forest, newham"],
  ["havering", "Havering", "East", "RM1, RM2, RM3, RM5, RM7, RM11, RM12, RM13, RM14", "Romford, Hornchurch, Upminster, Rainham, Harold Wood", "barking-and-dagenham, redbridge"],
  ["newham", "Newham", "East", "E6, E7, E12, E13, E15, E16", "Stratford, East Ham, Forest Gate, Canning Town, Plaistow", "tower-hamlets, hackney, waltham-forest, redbridge, barking-and-dagenham"],
  ["redbridge", "Redbridge", "East", "E11, E18, IG1, IG2, IG3, IG4, IG5, IG6, IG8", "Ilford, Woodford, Wanstead, Gants Hill, Seven Kings", "waltham-forest, newham, havering, barking-and-dagenham"],
  ["tower-hamlets", "Tower Hamlets", "East", "E1, E2, E3, E14", "Whitechapel, Bethnal Green, Bow, Canary Wharf, Poplar, Wapping", "hackney, newham, city-of-london, southwark, greenwich"],
  ["bromley", "Bromley", "South", "BR1, BR2, BR3, BR4, BR5, BR6, BR7, SE20", "Bromley, Beckenham, Orpington, Chislehurst, Penge", "croydon, lewisham, greenwich, bexley"],
  ["croydon", "Croydon", "South", "CR0, CR2, CR5, CR7, CR8, SE25, SW16", "Croydon, Thornton Heath, Purley, Norbury, South Norwood, Coulsdon", "sutton, merton, lambeth, bromley"],
  ["kingston-upon-thames", "Kingston upon Thames", "South", "KT1, KT2, KT3, KT5, KT6, KT9", "Kingston, Surbiton, New Malden, Chessington, Tolworth", "richmond-upon-thames, merton, sutton"],
  ["lewisham", "Lewisham", "South", "SE4, SE6, SE8, SE12, SE13, SE14, SE23, SE26", "Lewisham, Catford, Deptford, New Cross, Forest Hill, Sydenham", "southwark, greenwich, bromley"],
  ["merton", "Merton", "South", "SW19, SW20, CR4, SM4", "Wimbledon, Mitcham, Morden, Colliers Wood, Raynes Park", "wandsworth, sutton, croydon, kingston-upon-thames"],
  ["richmond-upon-thames", "Richmond upon Thames", "South", "TW1, TW2, TW9, TW10, TW11, TW12, SW13, SW14", "Richmond, Twickenham, Teddington, Barnes, Hampton, Kew", "kingston-upon-thames, hounslow, wandsworth"],
  ["sutton", "Sutton", "South", "SM1, SM2, SM3, SM5, SM6", "Sutton, Cheam, Carshalton, Wallington, Worcester Park", "croydon, merton, kingston-upon-thames"],
  ["wandsworth", "Wandsworth", "South", "SW11, SW12, SW15, SW17, SW18", "Battersea, Balham, Putney, Tooting, Wandsworth Town, Earlsfield", "lambeth, merton, richmond-upon-thames, hammersmith-and-fulham"],
  ["ealing", "Ealing", "West", "W3, W5, W7, W13, UB1, UB2, UB5, UB6", "Ealing, Acton, Southall, Hanwell, Greenford, Northolt", "hounslow, hillingdon, brent, hammersmith-and-fulham"],
  ["hammersmith-and-fulham", "Hammersmith and Fulham", "West", "W6, W12, W14, SW6", "Hammersmith, Fulham, Shepherd's Bush, White City", "kensington-and-chelsea, ealing, wandsworth"],
  ["hillingdon", "Hillingdon", "West", "UB3, UB4, UB7, UB8, UB10, HA4, HA6", "Uxbridge, Hayes, Ruislip, West Drayton, Northwood", "ealing, harrow, hounslow"],
  ["hounslow", "Hounslow", "West", "TW3, TW4, TW5, TW7, TW8, TW13, TW14, W4", "Hounslow, Chiswick, Brentford, Isleworth, Feltham", "ealing, richmond-upon-thames, hillingdon"],
];

const split = (s: string) => s.split(",").map((x) => x.trim());

export const areas: Area[] = rows.map(([slug, name, region, postcodes, places, nearby]) => ({
  slug,
  name,
  region,
  postcodes: split(postcodes),
  places: split(places),
  nearby: split(nearby),
}));

export const regions: Area["region"][] = ["Central", "North", "East", "South", "West"];

export function getArea(slug: string) {
  return areas.find((a) => a.slug === slug);
}

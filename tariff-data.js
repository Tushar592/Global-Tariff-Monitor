/* ============================================================================
   GLOBAL TARIFF MONITOR — DATA FILE
   ----------------------------------------------------------------------------
   This is the only file you edit to update the dashboard. Plain data.
   Tariffs are decimals: 0.25 = 25%.

   MODEL (generalised, not US-centric):
   1) Every country has an `mfn` = its average applied MFN tariff (what it charges
      ALL partners by default). Real WTO World Tariff Profiles ballparks.
   2) OVERRIDES = special bilateral measures (trade-war tariffs) layered on top.
      Key "ABC>XYZ" means: importer ABC applies this tariff on goods FROM exporter XYZ.
      Each event: { d:"YYYY-MM-DD", h:headline rate, e:effective rate after carve-outs }
      `h` = announced/statutory rate. `e` = what's actually collected once
      exemptions (USMCA, electronics, pharma…) are applied.
   3) The tariff between any importer→exporter at a date =
        OVERRIDE if one exists, otherwise the importer's `mfn`.

   TO UPDATE: add a {d,h,e} line to the relevant "ABC>XYZ" override (date order),
   or add a new override key. Add countries to COUNTRIES.

   LIVE DATA: WTO Timeseries API v1 (json/csv) provides applied-MFN & bound tariffs.
   For bilateral trade flows use UN Comtrade. Trade & sector figures below are
   2024 ballparks for impact estimates — clearly illustrative, edit freely.
============================================================================ */

export const META = {
  title: "Global Tariff Monitor",
  subtitle: "Bilateral import tariffs across the world's major economies",
  source: "WTO World Tariff Profiles (MFN) · trade-war measures 2024–2025",
  lastUpdate: "2025-08-13",
  defaultFocus: "USA",
};

// coord = [longitude, latitude]; mfn = average applied MFN tariff (%)
export const COUNTRIES = [
  { code:"USA", name:"United States", flag:"🇺🇸", coord:[-98, 39],   mfn:3.3,  imports:3170 },
  { code:"CHN", name:"China",          flag:"🇨🇳", coord:[104, 35.8], mfn:7.5,  imports:2560 },
  { code:"EU",  name:"European Union", flag:"🇪🇺", coord:[10, 50.5],  mfn:5.1,  imports:2950 },
  { code:"IND", name:"India",          flag:"🇮🇳", coord:[79, 22],    mfn:18.1, imports:710 },
  { code:"JPN", name:"Japan",          flag:"🇯🇵", coord:[138, 37],   mfn:4.2,  imports:790 },
  { code:"KOR", name:"South Korea",    flag:"🇰🇷", coord:[128, 36],   mfn:13.4, imports:640 },
  { code:"GBR", name:"United Kingdom", flag:"🇬🇧", coord:[-2, 54],    mfn:3.8,  imports:790 },
  { code:"CAN", name:"Canada",         flag:"🇨🇦", coord:[-106, 56],  mfn:3.8,  imports:570 },
  { code:"MEX", name:"Mexico",         flag:"🇲🇽", coord:[-102, 23.5],mfn:6.8,  imports:600 },
  { code:"BRA", name:"Brazil",         flag:"🇧🇷", coord:[-51, -10],  mfn:13.3, imports:240 },
  { code:"AUS", name:"Australia",      flag:"🇦🇺", coord:[134, -25],  mfn:2.4,  imports:300 },
  { code:"VNM", name:"Vietnam",        flag:"🇻🇳", coord:[108, 16],   mfn:9.4,  imports:380 },
  { code:"THA", name:"Thailand",       flag:"🇹🇭", coord:[101, 15],   mfn:11.5, imports:300 },
  { code:"TWN", name:"Taiwan",         flag:"🇹🇼", coord:[121, 23.7], mfn:6.5,  imports:350 },
  { code:"IDN", name:"Indonesia",      flag:"🇮🇩", coord:[113, -2],   mfn:8.1,  imports:230 },
  { code:"TUR", name:"Türkiye",        flag:"🇹🇷", coord:[35, 39],    mfn:10.8, imports:360 },
  { code:"CHE", name:"Switzerland",    flag:"🇨🇭", coord:[8, 47],     mfn:5.1,  imports:330 },
  { code:"SAU", name:"Saudi Arabia",   flag:"🇸🇦", coord:[45, 24],    mfn:5.6,  imports:170 },
  { code:"ZAF", name:"South Africa",   flag:"🇿🇦", coord:[25, -29],   mfn:7.7,  imports:110 },
  { code:"TUN", name:"Tunisia",        flag:"🇹🇳", coord:[9, 34],     mfn:14.0, imports:25 },
];

/* Sector mix + bilateral trade (US$B) attached to the importer→exporter relation.
   Illustrative 2024 ballparks. trade.imports = importer buys from exporter. */
const SEC = {
  CHN:[["Electronics & machinery",45],["Furniture & toys",12],["Textiles & apparel",10],["Plastics",6],["Auto parts",5],["Other",22]],
  EU: [["Machinery",24],["Pharmaceuticals",20],["Vehicles",14],["Chemicals",10],["Aircraft",8],["Other",24]],
  MEX:[["Vehicles & parts",28],["Electronics",22],["Machinery",14],["Agriculture",8],["Crude oil",6],["Other",22]],
  CAN:[["Energy & oil",28],["Vehicles",14],["Machinery",10],["Metals",9],["Lumber",7],["Other",32]],
  IND:[["Pharmaceuticals",18],["Textiles & apparel",16],["Gems & jewelry",14],["Machinery",10],["Chemicals",9],["Other",33]],
  VNM:[["Electronics",38],["Apparel & footwear",24],["Furniture",12],["Machinery",8],["Agriculture",6],["Other",12]],
  THA:[["Electronics",30],["Machinery",16],["Rubber",10],["Vehicles",9],["Food",8],["Other",27]],
  TWN:[["Semiconductors",38],["Electronics",22],["Machinery",14],["Metals",7],["Plastics",5],["Other",14]],
  TUN:[["Apparel & textiles",30],["Electrical",22],["Olive oil & food",14],["Machinery",10],["Chemicals",8],["Other",16]],
};
const sectors = (k)=> (SEC[k]||[]).map(([name,share])=>({name,share}));

export const OVERRIDES = {
  // ---- United States imposes on partners (headline h vs effective e) ----
  "USA>CHN":{ trade:{imports:439,exports:144}, sectors:sectors("CHN"),
    exemptions:["Smartphones, laptops & semiconductors exempted (Apr 2025)","Section 232 steel/aluminium tracked separately"],
    events:[{d:"2024-01-01",h:.21,e:.19},{d:"2025-01-01",h:.21,e:.19},{d:"2025-02-04",h:.21,e:.19},{d:"2025-03-04",h:.21,e:.19},{d:"2025-03-10",h:.22,e:.20},{d:"2025-04-09",h:.22,e:.20},{d:"2025-04-10",h:1.06,e:.55},{d:"2025-04-12",h:1.47,e:.62},{d:"2025-05-13",h:.50,e:.40}] },
  "USA>EU":{ trade:{imports:553,exports:371}, sectors:sectors("EU"),
    exemptions:["Aircraft & pharmaceuticals partial exemption under negotiation"],
    events:[{d:"2025-04-02",h:.10,e:.10},{d:"2025-07-27",h:.15,e:.13}] },
  "USA>MEX":{ trade:{imports:506,exports:334}, sectors:sectors("MEX"),
    exemptions:["USMCA-compliant goods exempt (~50% of imports)","Automotive content rules apply"],
    events:[{d:"2025-03-13",h:.25,e:.03},{d:"2025-08-01",h:.30,e:.05}] },
  "USA>CAN":{ trade:{imports:413,exports:349}, sectors:sectors("CAN"),
    exemptions:["USMCA-compliant goods exempt","Energy & potash capped at 10%"],
    events:[{d:"2025-03-13",h:.25,e:.04},{d:"2025-08-01",h:.35,e:.06}] },
  "USA>IND":{ trade:{imports:87,exports:42}, sectors:sectors("IND"),
    exemptions:["Pharmaceutical exports largely exempt"],
    events:[{d:"2025-04-02",h:.26,e:.24},{d:"2025-04-05",h:.10,e:.10},{d:"2025-08-01",h:.25,e:.23},{d:"2025-08-06",h:.50,e:.45}] },
  "USA>VNM":{ trade:{imports:137,exports:13}, sectors:sectors("VNM"),
    exemptions:["Transshipment provisions under review"],
    events:[{d:"2025-04-02",h:.46,e:.40},{d:"2025-04-05",h:.10,e:.10},{d:"2025-08-01",h:.20,e:.19}] },
  "USA>THA":{ trade:{imports:63,exports:17}, sectors:sectors("THA"),
    exemptions:["Electronics partially exempt"],
    events:[{d:"2025-04-02",h:.36,e:.32},{d:"2025-04-05",h:.10,e:.10},{d:"2025-08-01",h:.19,e:.18}] },
  "USA>TWN":{ trade:{imports:116,exports:42}, sectors:sectors("TWN"),
    exemptions:["Semiconductors exempted — sharply lowers effective rate"],
    events:[{d:"2025-04-02",h:.36,e:.20},{d:"2025-04-05",h:.10,e:.08},{d:"2025-08-01",h:.20,e:.12}] },
  "USA>TUN":{ trade:{imports:1.1,exports:0.7}, sectors:sectors("TUN"),
    exemptions:["Textile quotas under review"],
    events:[{d:"2025-04-03",h:.28,e:.25},{d:"2025-04-09",h:.10,e:.10},{d:"2025-08-01",h:.25,e:.23}] },

  // ---- Partner retaliation on the United States ----
  "CHN>USA":{ events:[{d:"2024-01-01",h:.19,e:.17},{d:"2025-01-01",h:.20,e:.18},{d:"2025-02-04",h:.30,e:.27},{d:"2025-03-04",h:.40,e:.36},{d:"2025-03-10",h:.42,e:.38},{d:"2025-04-05",h:.49,e:.44},{d:"2025-04-09",h:1.04,e:.62},{d:"2025-04-10",h:1.34,e:.70},{d:"2025-04-12",h:1.24,e:.66},{d:"2025-05-13",h:.30,e:.26}] },
  "EU>USA":{ events:[{d:"2025-04-02",h:.05,e:.04},{d:"2025-07-27",h:.00,e:.00}] },
  "IND>USA":{ events:[{d:"2025-04-02",h:.52,e:.47},{d:"2025-08-01",h:.30,e:.27}] },
  "CAN>USA":{ events:[{d:"2025-03-13",h:.25,e:.20},{d:"2025-08-01",h:.10,e:.08}] },
};

/* Map annotations — clickable pins + timeline ticks. `code` places the pin. */
export const EVENTS = [
  { date:"2025-02-04", code:"CHN", title:"First 2025 China round",      desc:"US adds 10% across Chinese goods; China retaliates on energy & autos." },
  { date:"2025-03-13", code:"CAN", title:"Steel & aluminium 25%",       desc:"Section 232 metal tariffs hit Canada & Mexico." },
  { date:"2025-04-02", code:"USA", title:"“Liberation Day” reciprocal", desc:"Sweeping reciprocal tariffs announced on most trading partners." },
  { date:"2025-04-09", code:"CHN", title:"Peak escalation",             desc:"US–China rates spike above 100%; 90-day pause granted to others." },
  { date:"2025-05-13", code:"CHN", title:"Geneva truce",                desc:"US & China roll rates back to ~50% / 30% for 90 days." },
  { date:"2025-08-01", code:"IND", title:"New reciprocal rates",        desc:"Updated country rates take effect; India raised toward 25–50%." },
];

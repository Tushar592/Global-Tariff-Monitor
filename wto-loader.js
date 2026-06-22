/* ============================================================================
   WTO TIMESERIES API v1 — LIVE DATA LOADER  (scaffold)
   ----------------------------------------------------------------------------
   This module pulls live applied-MFN tariff rates from the WTO Timeseries API
   and maps them into the exact shape the dashboard already reads
   (the same {mfn} fields used in tariff-data.js).

   IT DOES NOT RUN BY DEFAULT. The dashboard keeps using tariff-data.js until
   you (1) deploy the proxy in wto-proxy.example.js, (2) set CONFIG below, and
   (3) flip USE_LIVE to true, then wire the 3-line hook (see bottom of file).

   WHY A PROXY?  The WTO API needs a secret subscription key sent as the header
   `Ocp-Apim-Subscription-Key`. You must NEVER ship that key in browser code,
   and the WTO API does not send CORS headers. The proxy keeps the key on a
   server and adds CORS. See wto-proxy.example.js + WTO-API-SETUP.md.

   WHAT THE API GIVES YOU:  headline / statutory applied-MFN tariff averages
   (and bound rates). What it does NOT give you: the *effective* rate after
   2025 carve-outs (USMCA, electronics, Section 232) or the day-by-day trade
   war escalation. Those stay in tariff-data.js as your modelled `OVERRIDES`.
   So: live = baseline MFN; your file = effective + trade-war layer.
============================================================================ */

export const CONFIG = {
  USE_LIVE: true,                // live is ON; falls back to static until PROXY_URL is set
  // ↓ PASTE your Apps Script "/exec" web-app URL here (see wto-apps-script.gs)
  PROXY_URL: "https://script.google.com/macros/s/AKfycbzxlMi30TiKl7V7O3TE_POJeERKn6jP2PTSl0reu5aWG7ZBjrrpCA4HcumVgD1xWF9CFA/exec",
  PROXY_MODE: "appsscript",      // "appsscript" → ?path=…  |  "path" → /…  (Vercel/CF)
  SHEET_BACKED: true,            // load all data from the shared Google Sheet (via Apps Script)
  YEARS: "2018:2025",            // range to request; we use the latest available

  // WTO "reporting economy" codes. The Timeseries API uses ISO-3166 alpha-3
  // for most economies; the EU is the bloc code "EUN"/"918" depending on the
  // dataset. CONFIRM each against /territories on first run (helper below).
  ECON: {
    USA:"USA", CHN:"CHN", EU:"EUN", IND:"IND", JPN:"JPN", KOR:"KOR", GBR:"GBR",
    CAN:"CAN", MEX:"MEX", BRA:"BRA", AUS:"AUS", VNM:"VNM", THA:"THA", TWN:"TPKM",
    IDN:"IDN", TUR:"TUR", CHE:"CHE", SAU:"SAU", ZAF:"ZAF", TUN:"TUN"
  },

  // Indicator code for "MFN applied tariff — simple average, all products".
  // Look this up once via the /indicators endpoint (helper: listIndicators()).
  // Common families: HS_A_* (applied) and HS_B_* (bound). Placeholder below.
  INDICATOR_MFN_SIMPLE: "HS_A_0010"
};

/* ---- is the proxy actually configured yet? ------------------------------ */
export function proxyReady() {
  return CONFIG.USE_LIVE && CONFIG.PROXY_URL && !/PASTE_YOUR/.test(CONFIG.PROXY_URL);
}

/* ---- low-level fetch through your proxy --------------------------------- */
/* Apps Script web apps take ONE endpoint and read everything from the query
   string, so we send the WTO path as ?path=… . A Vercel/Cloudflare proxy uses
   real /path segments — set PROXY_MODE:"path" for that.                       */
async function wto(path, params) {
  const all = Object.assign({ fmt: "json", mode: "full" }, params);
  let url;
  if (CONFIG.PROXY_MODE === "appsscript") {
    url = `${CONFIG.PROXY_URL}?${new URLSearchParams(Object.assign({ path }, all)).toString()}`;
  } else {
    url = `${CONFIG.PROXY_URL}/${path}?${new URLSearchParams(all).toString()}`;
  }
  const res = await fetch(url);           // no custom headers → no CORS preflight
  if (!res.ok) throw new Error(`WTO proxy ${res.status} on ${path}`);
  return res.json();
}

/* ---- discovery helpers (run once in the console to find codes) ---------- */
export async function listIndicators() { return wto("indicators", {}); }      // find INDICATOR_MFN_SIMPLE
export async function listTerritories() { return wto("territories", {}); }    // confirm ECON codes

/* ---- pull latest MFN % for a single reporter ---------------------------- */
export async function fetchMFN(internalCode) {
  const r = CONFIG.ECON[internalCode];
  if (!r) return null;
  // data?i=<indicator>&r=<reporter>&ps=<years>  → array of {Year, Value, ...}
  const data = await wto("data", { i: CONFIG.INDICATOR_MFN_SIMPLE, r, ps: CONFIG.YEARS });
  const rows = (data && (data.Dataset || data.data || data)) || [];
  if (!rows.length) return null;
  rows.sort((a, b) => (b.Year || b.year || 0) - (a.Year || a.year || 0)); // newest first
  const v = rows[0].Value != null ? rows[0].Value : rows[0].value;
  return v == null ? null : Number(v); // already a percent, e.g. 3.3
}

/* ============================================================================
   HS / PRODUCT-LEVEL DUTIES (per country)
   ----------------------------------------------------------------------------
   Pulls the applied tariff for a specific HS code that one importer charges.
   The WTO Timeseries product dimension is `pc` (product code) — pass the HS
   chapter/heading (2/4/6 digit). Returns a DECIMAL rate (0.25 = 25%).

   NOTE on bilateral: WTO Timeseries gives MFN-applied at HS level (what the
   importer charges everyone). True *preferential* (FTA) bilateral rates by HS
   live in UNCTAD/World Bank **WITS** — if you have a WITS endpoint, point
   `pcIndicator`/path at it; the shape below is the same.

   Indicator for HS-level applied tariff (simple avg): look up via
   listIndicators() — often the same HS_A_* family with a product code.
============================================================================ */
export const HS_INDICATOR = "HS_A_0010"; // refine via listIndicators() if needed

/* one importer, one HS code → applied tariff as a decimal (0.25) */
export async function fetchHsDuty(importerInternal, hsCode) {
  const r = CONFIG.ECON[importerInternal];
  if (!r || !hsCode) return null;
  const pc = String(hsCode).replace(/[^0-9]/g, "");
  const data = await wto("data", { i: HS_INDICATOR, r, pc, ps: CONFIG.YEARS });
  const rows = (data && (data.Dataset || data.data || data)) || [];
  if (!rows.length) return null;
  rows.sort((a, b) => (b.Year || b.year || 0) - (a.Year || a.year || 0));
  const v = rows[0].Value != null ? rows[0].Value : rows[0].value;
  return v == null ? null : Number(v) / 100; // percent → decimal
}

/* Build a lookup the dashboard reads: { "<hs>|<importer>|<partner>": decimalRate }.
   Because MFN-applied is charged to all origins alike, every partner gets the
   importer's HS rate. (When you wire WITS preferential data, vary per partner.)
   Returns null if the proxy isn't configured yet (dashboard shows estimates). */
export async function loadHsDuties(hsCode, importerInternal, partnerInternals) {
  if (!proxyReady() || !hsCode) return null;
  let rate;
  try { rate = await fetchHsDuty(importerInternal, hsCode); }
  catch (e) { console.warn("WTO HS duty failed", e); return null; }
  if (rate == null) return null;
  const out = {};
  const hs = String(hsCode).replace(/[^0-9]/g, "");
  (partnerInternals || []).forEach((p) => { out[hs + "|" + importerInternal + "|" + p] = rate; });
  return out;
}

/* ============================================================================
   GOOGLE-SHEET BACKED DATA (shared source of truth for everyone)
   ----------------------------------------------------------------------------
   loadSheet()  — pulls every tab from the shared spreadsheet via the Apps
   Script backend (tariff-sheet-backend.gs, ?path=load) and returns the same
   {COUNTRIES, OVERRIDES, EVENTS, META} shape the dashboard reads.
   saveSheet()  — writes Manage edits back so they persist for all users
   (replaces per-browser localStorage).
============================================================================ */
export async function loadSheet(staticFallback) {
  if (!proxyReady() || !CONFIG.SHEET_BACKED) return null;   // not wired → caller keeps static/localStorage
  try {
    const sep = CONFIG.PROXY_URL.indexOf("?") >= 0 ? "&" : "?";
    const res = await fetch(CONFIG.PROXY_URL + sep + "path=load");
    if (!res.ok) throw new Error("sheet load " + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.COUNTRIES || !data.COUNTRIES.length) throw new Error("sheet has no countries");
    // merge META so titles/strings from the static file survive
    data.META = Object.assign({}, staticFallback && staticFallback.META, data.META);
    return data;
  } catch (e) { console.warn("Sheet load failed, using local data:", e); return null; }
}

/* payload: { countries:[...], tariffs:[{importer,exporter,date,headline_pct,effective_pct}] } */
export async function saveSheet(payload) {
  if (!proxyReady() || !CONFIG.SHEET_BACKED) return { ok: false, reason: "not configured" };
  try {
    const res = await fetch(CONFIG.PROXY_URL, {
      method: "POST",
      // text/plain avoids a CORS preflight against Apps Script
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save", payload })
    });
    return await res.json();
  } catch (e) { console.warn("Sheet save failed:", e); return { ok: false, reason: String(e) }; }
}

/* ---- main entry: merge live MFN over your static data ------------------- */
/* Pass in the static module (COUNTRIES, OVERRIDES, META, EVENTS). Returns a
   new object of the same shape with each country's `mfn` refreshed from the
   API. OVERRIDES / EVENTS (the effective + trade-war layer) are untouched.   */
export async function loadLive(staticData) {
  if (!proxyReady()) {                      // not configured yet → run on your file
    if (CONFIG.USE_LIVE) console.info("WTO live ON, but PROXY_URL not set — using tariff-data.js. Paste your Apps Script /exec URL in wto-loader.js.");
    return staticData;
  }
  const COUNTRIES = await Promise.all(staticData.COUNTRIES.map(async (c) => {
    try { const mfn = await fetchMFN(c.code); return mfn == null ? c : Object.assign({}, c, { mfn }); }
    catch (e) { console.warn("WTO MFN failed for", c.code, e); return c; }
  }));
  const META = Object.assign({}, staticData.META, {
    lastUpdate: new Date().toISOString().slice(0, 10),
    source: "WTO Timeseries API v1 (MFN) · effective + trade-war layer from tariff-data.js"
  });
  return { META, COUNTRIES, OVERRIDES: staticData.OVERRIDES, EVENTS: staticData.EVENTS };
}

/* ============================================================================
   INTEGRATION HOOK — paste into the dashboard's componentDidMount, replacing
   the existing `import('./tariff-data.js').then(...)` body's data assignment:

     import('./tariff-data.js').then(async (mod) => {
       const live = await import('./wto-loader.js');
       const data = await live.loadLive(mod);   // returns static if USE_LIVE=false
       this.META = data.META; this.baseC = data.COUNTRIES;
       this.OVR = data.OVERRIDES; this.EV = data.EVENTS;
       ... (rest unchanged: read saved admin, prep(), setState ready) ...
     });

   With USE_LIVE=false this is a no-op and the dashboard runs on your file.
============================================================================ */

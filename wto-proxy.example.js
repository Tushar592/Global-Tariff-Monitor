/* ============================================================================
   WTO API PROXY — sample serverless function
   ----------------------------------------------------------------------------
   Keeps your WTO subscription key server-side and adds CORS so the browser
   dashboard can call the WTO Timeseries API through wto-loader.js.

   The loader calls:  <PROXY_URL>/<path>?<query>
   e.g.               /api/wto/data?i=HS_A_0010&r=USA&ps=2018:2025&fmt=json
   This forwards to:  https://api.wto.org/timeseries/v1/<path>?<query>
   with your secret key attached as a header.

   Get a free key: register at the WTO API portal, subscribe to "Timeseries",
   copy the primary key, and set it as the env var WTO_API_KEY (never in code).
============================================================================ */

/* ---------- Option A: Vercel / Next.js API route ----------------------------
   File: /api/wto/[...path].js     Env: WTO_API_KEY                            */
export default async function handler(req, res) {
  const key = process.env.WTO_API_KEY;
  if (!key) return res.status(500).json({ error: "WTO_API_KEY not set" });

  const path = (req.query.path || []).join("/");           // e.g. "data"
  const qs = req.url.split("?")[1] || "";                  // forward all params
  const url = `https://api.wto.org/timeseries/v1/${path}?${qs}`;

  const upstream = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": key } });
  const body = await upstream.text();

  res.setHeader("Access-Control-Allow-Origin", "*");        // tighten to your domain in prod
  res.setHeader("Cache-Control", "s-maxage=86400");         // cache a day — tariffs move slowly
  res.setHeader("Content-Type", "application/json");
  return res.status(upstream.status).send(body);
}

/* ---------- Option B: Cloudflare Worker -------------------------------------
   Bind a secret: `wrangler secret put WTO_API_KEY`

export default {
  async fetch(request, env) {
    const inUrl = new URL(request.url);
    const path = inUrl.pathname.replace(/^\/api\/wto\/?/, "");
    const target = `https://api.wto.org/timeseries/v1/${path}${inUrl.search}`;
    const r = await fetch(target, { headers: { "Ocp-Apim-Subscription-Key": env.WTO_API_KEY } });
    const res = new Response(r.body, r);
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }
};
----------------------------------------------------------------------------- */

/* ---------- Option C: tiny Node/Express server ------------------------------
const express = require("express");
const app = express();
app.get("/api/wto/:path", async (req, res) => {
  const url = `https://api.wto.org/timeseries/v1/${req.params.path}?${req.url.split("?")[1] || ""}`;
  const r = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": process.env.WTO_API_KEY } });
  res.set("Access-Control-Allow-Origin", "*").status(r.status).send(await r.text());
});
app.listen(3001, () => console.log("WTO proxy on :3001"));
----------------------------------------------------------------------------- */

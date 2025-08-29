const express = require("express");
const { scrapeFacebook } = require("./facebook-scraper");
const path = require("path");

const app = express();
const port = 3000;
// Use your PRODUCTION URL (since it's working)
const N8N_WEBHOOK_URL = "http://localhost:5678/webhook/c1813ccd-c578-4aa2-b1ea-509f7a52d20e";

async function postJson(url, payload) {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await resp.text(); // often empty; that's fine
    console.log(`[n8n] POST ${url} -> ${resp.status}${text ? " | " + text : ""}`);
    return resp.ok;
  } catch (e) {
    console.warn("[n8n] Forward failed:", e.message);
    return false;
  }
}

app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { for: searchTerm, platform, location } = req.body || {};
  if (platform !== "facebook") return res.status(400).json({ error: "Invalid platform" });
  if (!searchTerm || !location) return res.status(400).json({ error: "`for` and `location` are required" });

  try {
    const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(searchTerm)}%20in%20${encodeURIComponent(location)}`;

    // 🆕 add a trace id so we can verify the exact row in DB / n8n runs
    const traceId = `scrape_${Date.now()}`;

    const results = await scrapeFacebook(searchUrl, {
      storageStatePath: path.resolve(__dirname, "fb-auth.json"),
      headless: true,
    });

    // send results into n8n
    await postJson(N8N_WEBHOOK_URL, {
      traceId: `scrape_${Date.now()}`,                 // 🆕 added
      platform,                // 🆕 added so your Switch node can match
      results,
      query: { searchTerm, location },
    });

    // 🆕 include traceId in response so you can search it in DB/n8n Executions
    res.json({ count: results.length, results, traceId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while scraping" });
  }
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
  console.log(`[n8n] Forward target: ${N8N_WEBHOOK_URL}`);
});

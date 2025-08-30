const express = require("express");
const { scrapeFacebook } = require("./facebook-scraper");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { for: searchTerm, platform, location } = req.body || {};

  if (platform !== "facebook") {
    return res.status(400).json({ error: "Invalid platform" });
  }
  if (!searchTerm || !location) {
    return res.status(400).json({ error: "`for` and `location` are required" });
  }

  try {
    const searchUrl = `https://www.facebook.com/search/pages/?q=${encodeURIComponent(
      searchTerm
    )}%20in%20${encodeURIComponent(location)}`;

    const traceId = `scrape_${Date.now()}`;

    const results = await scrapeFacebook(searchUrl, {
      storageStatePath: path.resolve(__dirname, "fb-auth.json"),
      headless: true,
    });

    // IMPORTANT: Do NOT post back to n8n here.
    // Just return the data to the caller (n8n HTTP Request node).
    res.json({
      traceId,
      platform,
      query: { searchTerm, location },
      results,
      count: results.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while scraping" });
  }
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});

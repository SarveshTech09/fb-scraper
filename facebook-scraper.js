const playwright = require("playwright");
const path = require("path");

/**
 * Scrape a Facebook search results page.
 * @param {string} searchUrl Full Facebook search URL
 * @param {object} opts
 * @param {string} [opts.storageStatePath] absolute/relative path to fb-auth.json
 * @param {boolean} [opts.headless=true]
 */
async function scrapeFacebook(searchUrl, opts = {}) {
  const {
    storageStatePath = path.resolve(__dirname, "fb-auth.json"),
    headless = true,
  } = opts;

  const browser = await playwright.chromium.launch({ headless });
  const context = await browser.newContext({
    // MUST be logged-in cookies or FB will block results
    storageState: storageStatePath,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Load more results
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(800);
    }

    await page.waitForTimeout(1500);

    const results = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll("div[role='article']").forEach((el) => {
        const anchor = el.querySelector("a[href*='/pages/'], a[href*='facebook.com/']");
        const name = anchor?.innerText?.trim() || "";
        const url = anchor?.href || "";
        const info = el.innerText || "";

        const phoneMatch = info.match(/\+?\d[\d\s\-]{7,}/);
        const locationMatch = info.match(/Bangalore|Indiranagar|Koramangala|Jayanagar/i);

        data.push({
          name,
          url,
          phone: phoneMatch ? phoneMatch[0] : null,
          location: locationMatch ? locationMatch[0] : null,
          raw: info,
        });
      });
      return data;
    });

    return results;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeFacebook };

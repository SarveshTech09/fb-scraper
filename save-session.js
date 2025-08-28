const playwright = require("playwright");
const fs = require("fs");
const readline = require("readline");

(async () => {
  const browser = await playwright.chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.facebook.com/login");
  console.log("🧑 Please log in manually in the browser (including 2FA if required)");

  // Wait for user to confirm they've logged in
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("📌 Press ENTER after you are fully logged in to Facebook: ", async () => {
    const storageState = await context.storageState();
    fs.writeFileSync("fb-auth.json", JSON.stringify(storageState, null, 2));
    console.log("✅ Session saved to fb-auth.json");

    await browser.close();
    rl.close();
  });
})();


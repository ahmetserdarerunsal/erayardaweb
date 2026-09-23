import { chromium } from "playwright-core";

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
];

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

let failed = false;
for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("http://localhost:3000", { waitUntil: "load" });
  await page.evaluate(async () => {
    for (let position = 0; position < document.body.scrollHeight; position += window.innerHeight) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    h1Count: document.querySelectorAll("h1").length,
    heroTextOverflow: (() => {
      const heading = document.querySelector(".hero h1");
      return heading ? heading.scrollWidth > heading.clientWidth : true;
    })(),
  }));
  const imageUrls = await page.locator("img").evaluateAll((images) => [...new Set(images.map((image) => image.src))]);
  const imageResponses = await Promise.all(imageUrls.map((url) => page.request.get(url)));
  const brokenImages = imageResponses.filter((response) => !response.ok()).length;

  if (viewport.width <= 1024) {
    await page.getByRole("button", { name: "MENÜ" }).click();
    const locked = await page.evaluate(() => document.body.style.overflow === "hidden");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const closed = await page.locator("#mobile-menu-panel").count() === 0;
    const restored = await page.evaluate(() => document.body.style.overflow !== "hidden");
    if (!locked || !closed || !restored) errors.push("Mobile menu focus/scroll lifecycle failed");
  }

  const invalid = result.horizontalOverflow || result.heroTextOverflow || result.h1Count !== 1 || brokenImages > 0 || errors.length > 0;
  failed ||= invalid;
  console.log(JSON.stringify({ viewport: `${viewport.width}x${viewport.height}`, ...result, brokenImages, errors, status: invalid ? "FAIL" : "PASS" }));
  await page.close();
}

const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await reducedPage.goto("http://localhost:3000", { waitUntil: "load" });
const reducedMotion = await reducedPage.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
console.log(JSON.stringify({ reducedMotion, status: reducedMotion ? "PASS" : "FAIL" }));
failed ||= !reducedMotion;
await browser.close();
if (failed) process.exit(1);

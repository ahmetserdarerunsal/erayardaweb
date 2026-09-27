import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const viewports = [
  { width: 390, height: 844, screenshot: "artifacts/home-390.png" },
  { width: 430, height: 932 },
  { width: 768, height: 1024, screenshot: "artifacts/home-768.png" },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000, screenshot: "artifacts/home-1440.png" },
  { width: 1920, height: 1080, screenshot: "artifacts/home-1920.png" },
];

await mkdir("artifacts", { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

let failed = false;

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  if (!response?.ok()) errors.push(`Page response: ${response?.status() ?? "none"}`);

  await page.evaluate(async () => {
    for (let position = 0; position < document.body.scrollHeight; position += window.innerHeight) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);

  const result = await page.evaluate(() => {
    const heading = document.querySelector(".hero h1");
    const heroImage = document.querySelector(".photo-hero__image");
    const hero = document.querySelector(".photo-hero");
    const heroCopy = document.querySelector(".photo-hero__copy");
    const heroRole = document.querySelector(".photo-hero__role");
    const heroLink = document.querySelector(".photo-hero__link");
    const wordmark = document.querySelector(".wordmark");
    const siteHeader = document.querySelector(".site-header");
    const siteHeaderInner = document.querySelector(".site-header__inner");
    const visibleDesktopTitleLines = [...document.querySelectorAll(".photo-hero__title-desktop")]
      .filter((element) => getComputedStyle(element).display !== "none").length;
    const interactiveElements = [...document.querySelectorAll("a[href], button")];

    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      h1Count: document.querySelectorAll("h1").length,
      heroTextOverflow: heading ? heading.scrollWidth > heading.clientWidth : true,
      heroImageLoaded: heroImage instanceof HTMLImageElement && heroImage.complete && heroImage.naturalWidth > 0,
      heroImageSource: heroImage instanceof HTMLImageElement ? heroImage.currentSrc : "",
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      heroCopyLeft: heroCopy ? Math.round(heroCopy.getBoundingClientRect().left) : -1,
      headerWordmarkLeft: wordmark ? Math.round(wordmark.getBoundingClientRect().left) : -1,
      headerHeight: siteHeaderInner ? Math.round(siteHeaderInner.getBoundingClientRect().height) : 0,
      headerBorderBottomWidth: siteHeader ? getComputedStyle(siteHeader).borderBottomWidth : "missing",
      headerBorderBottomColor: siteHeader ? getComputedStyle(siteHeader).borderBottomColor : "missing",
      headerBorderTransparent: siteHeader
        ? Number(
            getComputedStyle(siteHeader).borderBottomColor.match(/,\s*([\d.]+)\)$/)?.[1] ?? 1,
          ) < 0.01
        : false,
      headerBoxShadow: siteHeader ? getComputedStyle(siteHeader).boxShadow : "missing",
      heroRoleFontSize: heroRole ? Number.parseFloat(getComputedStyle(heroRole).fontSize) : 0,
      heroLinkFontSize: heroLink ? Number.parseFloat(getComputedStyle(heroLink).fontSize) : 0,
      heroLinkTarget: heroLink?.getAttribute("href") ?? "",
      visibleDesktopTitleLines,
      emptyLinks: interactiveElements.filter((element) => !element.getAttribute("href") && element.tagName === "A").length,
      wideElements: [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            element: `${element.tagName.toLowerCase()}.${element.className}`,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((item) => item.left < -1 || item.right > window.innerWidth + 1)
        .slice(0, 8),
    };
  });

  if (viewport.screenshot) {
    await page.screenshot({ path: viewport.screenshot, fullPage: true });
  }

  if (viewport.width <= 1024) {
    const menuButton = page.getByRole("button", { name: "Menü", exact: true });
    await menuButton.click();
    const locked = await page.evaluate(() => document.body.style.overflow === "hidden");
    const dialogVisible = await page.getByRole("dialog", { name: "Ana menü" }).isVisible();
    if (viewport.width === 390) {
      await page.screenshot({ path: "artifacts/menu-390.png", fullPage: false });
    }
    await page.keyboard.press("Escape");
    const closed = (await page.locator("#mobile-menu-panel").count()) === 0;
    const restored = await page.evaluate(() => document.body.style.overflow !== "hidden");
    const focusReturned = await menuButton.evaluate((button) => document.activeElement === button);

    if (!locked || !dialogVisible || !closed || !restored || !focusReturned) {
      errors.push("Mobile menu lifecycle failed");
    }
  }

  const expectedHeaderLeft = Math.round(
    (viewport.width > 1600 ? (viewport.width - 1600) / 2 : 0) +
      Math.min(80, Math.max(24, viewport.width * 0.045)),
  );
  const expectedHeroLeft = Math.round(Math.min(80, Math.max(24, viewport.width * 0.045)));
  const invalid =
    result.horizontalOverflow ||
    result.heroTextOverflow ||
    !result.heroImageLoaded ||
    !result.heroImageSource.includes(viewport.width <= 820 ? "hero-mobile.png" : "hero-desktop.png") ||
    result.h1Count !== 1 ||
    result.emptyLinks > 0 ||
    result.headerBorderBottomWidth !== "1px" ||
    !result.headerBorderTransparent ||
    result.headerBoxShadow !== "none" ||
    (viewport.width >= 1440 && (
      result.heroHeight < viewport.height - 1 ||
      result.visibleDesktopTitleLines !== 2 ||
      Math.abs(result.heroCopyLeft - expectedHeroLeft) > 2 ||
      Math.abs(result.headerWordmarkLeft - expectedHeaderLeft) > 2 ||
      result.headerHeight > 90 ||
      result.heroRoleFontSize < 38 ||
      result.heroRoleFontSize > 42.5 ||
      result.heroLinkFontSize < 22 ||
      result.heroLinkFontSize > 24.5 ||
      result.heroLinkTarget !== "#calismalar"
    )) ||
    errors.length > 0;

  failed ||= invalid;
  console.log(
    JSON.stringify({
      viewport: `${viewport.width}x${viewport.height}`,
      ...result,
      errors,
      status: invalid ? "FAIL" : "PASS",
    }),
  );
  await page.close();
}

const reducedPage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
await reducedPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
const reducedMotion = await reducedPage.evaluate(() =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);
console.log(JSON.stringify({ reducedMotion, status: reducedMotion ? "PASS" : "FAIL" }));
failed ||= !reducedMotion;

for (const route of [
  "/ekrem-eray-arda",
  "/kartal",
  "/istanbul",
  "/fotograflar",
  "/videolar",
  "/basin",
  "/medya",
  "/basin-medya",
  "/iletisim",
]) {
  const response = await reducedPage.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" });
  if (!response?.ok()) {
    failed = true;
    console.log(JSON.stringify({ route, status: "FAIL", response: response?.status() ?? null }));
  }
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  const page = await browser.newPage({ viewport });

  for (const archive of [
    { route: "/fotograflar", heading: "FOTOĞRAF ARŞİVİ", label: "04 / Fotoğraf" },
    { route: "/videolar", heading: "VİDEO ARŞİVİ", label: "05 / Video" },
  ]) {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`http://localhost:3000${archive.route}`, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => ({
      heading: document.querySelector(".media-page__hero h1")?.textContent?.trim() ?? "",
      label: document.querySelector(".media-page__hero .section-kicker")?.textContent?.trim() ?? "",
      emptyState: Boolean(document.querySelector(".media-empty, .photo-empty, .video-empty")),
      photoPreview: Boolean(document.querySelector(".photo-card__static")),
      photoColumns: document.querySelector(".photo-grid")
        ? getComputedStyle(document.querySelector(".photo-grid")).gridTemplateColumns.split(" ").length
        : 0,
      brokenAlbumActions: document.querySelectorAll(
        ".photo-card__static .photo-card__cta, .photo-card__static button",
      ).length,
      videoPreview: Boolean(document.querySelector(".video-card__preview")),
      videoColumns: document.querySelector(".video-grid")
        ? getComputedStyle(document.querySelector(".video-grid")).gridTemplateColumns.split(" ").length
        : 0,
      brokenVideoPreviewActions: document.querySelectorAll(
        ".video-card__preview button, .video-card__preview a",
      ).length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      photoLink: Boolean(document.querySelector('a[href="/fotograflar"]')),
      videoLink: Boolean(document.querySelector('a[href="/videolar"]')),
    }));
    if (archive.route === "/fotograflar" || archive.route === "/videolar") {
      await page.screenshot({
        path: `artifacts/${archive.route.slice(1)}-${viewport.width}.png`,
        fullPage: true,
      });
    }
    const invalid =
      !response?.ok() ||
      result.heading !== archive.heading ||
      result.label !== archive.label ||
      (archive.route === "/fotograflar"
        ? !result.emptyState && !result.photoPreview
        : !result.emptyState && !result.videoPreview) ||
      (result.photoPreview && result.photoColumns !== (viewport.width <= 640 ? 1 : 2)) ||
      (result.videoPreview && result.videoColumns !== (viewport.width <= 640 ? 1 : 2)) ||
      result.brokenAlbumActions > 0 ||
      result.brokenVideoPreviewActions > 0 ||
      result.horizontalOverflow ||
      !result.photoLink ||
      !result.videoLink ||
      errors.length > 0;

    failed ||= invalid;
    console.log(JSON.stringify({
      route: archive.route,
      viewport: `${viewport.width}x${viewport.height}`,
      ...result,
      errors,
      status: invalid ? "FAIL" : "PASS",
    }));
  }

  await page.close();
}

await browser.close();
if (failed) process.exit(1);

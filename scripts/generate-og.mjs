/**
 * Paylaşım görseli (1200x630) ve uygulama ikonlarını üretir.
 *
 * Satori/ImageResponse yerine gerçek tarayıcı kullanılıyor: Türkçe
 * karakterler ve Montserrat'ın ağırlıkları böylece birebir siteyle aynı
 * çıkıyor. Görseller build çıktısı değil, depoya yazılan statik dosyalar.
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP = "C:/Users/Ahmet Serdar Erünsal/Desktop/erayardaweb/src/app";

const NAVY = "#102a43";
const NIGHT = "#081c2f";
const IVORY = "#f8f6f1";
const BLUE_LIGHT = "#c8d8ee";

const ogHtml = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;font-family:Montserrat,sans-serif;background:${NIGHT}}
  .wrap{position:relative;width:1200px;height:630px}
  .photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% 18%}
  .veil{position:absolute;inset:0;background:
    linear-gradient(90deg, ${NAVY} 0%, rgba(16,42,67,.97) 24%, rgba(16,42,67,.82) 38%, rgba(16,42,67,.45) 52%, rgba(16,42,67,.08) 66%, rgba(16,42,67,0) 76%),
    linear-gradient(180deg, rgba(8,28,47,.45) 0%, rgba(8,28,47,0) 30%, rgba(8,28,47,.35) 100%)}
  .copy{position:absolute;left:72px;top:0;height:630px;display:flex;flex-direction:column;justify-content:center;gap:26px;width:620px}
  .kicker{display:flex;align-items:center;gap:16px;color:${BLUE_LIGHT};font-size:19px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
  .kicker::before{content:"";width:56px;height:2px;background:${BLUE_LIGHT}}
  h1{color:#fff;font-size:92px;font-weight:800;letter-spacing:-.05em;line-height:.9}
  p{color:${IVORY};font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.25;opacity:.94}
  .rule{width:96px;height:3px;background:${IVORY};opacity:.45}
</style></head><body><div class="wrap">
  <img class="photo" src="http://localhost:3000/images/hero-desktop.png">
  <div class="veil"></div>
  <div class="copy">
    <span class="kicker">Kişisel Web Sitesi</span>
    <h1>EKREM<br>ERAY ARDA</h1>
    <div class="rule"></div>
    <p>İBB ve Kartal Belediye Meclis Üyesi</p>
  </div>
</div></body></html>`;

/**
 * İkon karosu doğrudan canvas'a çizilir.
 *
 * CSS ile dikey ortalamada satır kutusu harften büyük olduğu için "EEA" hep
 * yukarıda kalıyordu; burada measureText'in mürekkep kutusu kullanılıyor.
 * Punto da sabit değil: harfler karonun `fill` oranı kadar yer kaplayacak
 * şekilde ölçülüp hesaplanıyor, böylece her boyutta aynı doluluk.
 */
const ciz = async ([size, radius, fill]) => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#102a43";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  await document.fonts.load("800 100px Montserrat");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8f6f1";

  ctx.font = "800 100px Montserrat";
  const punto = 100 * ((size * fill) / ctx.measureText("EEA").width);
  ctx.font = `800 ${punto}px Montserrat`;

  const m = ctx.measureText("EEA");
  const taban = size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillText("EEA", size / 2, taban);

  return canvas.toDataURL("image/png");
};

const b = await chromium.launch({ executablePath: CHROME, headless: true });

// --- Paylaşım görseli ---
const og = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.setContent(ogHtml, { waitUntil: "networkidle" });
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(600);
await og.screenshot({ path: `${APP}/opengraph-image.png` });
await og.close();

// --- İkonlar ---
const icons = await b.newPage();
await icons.setContent(
  `<!doctype html><html><head><meta charset="utf-8">
   <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap" rel="stylesheet">
   </head><body></body></html>`,
  { waitUntil: "networkidle" },
);
await icons.evaluate(() => document.fonts.ready);

for (const [size, radius, out] of [
  [512, 88, `${APP}/icon.png`],
  [180, 31, `${APP}/apple-icon.png`],
]) {
  const veri = await icons.evaluate(ciz, [size, radius, 0.9]);
  writeFileSync(out, Buffer.from(veri.split(",")[1], "base64"));
}
await icons.close();

await b.close();
console.log("uretildi: opengraph-image.png (1200x630), icon.png (512), apple-icon.png (180)");

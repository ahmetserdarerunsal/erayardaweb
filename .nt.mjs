/** X'in status sayfasındaki NoteTweet (uzun gönderi) metnini çıkarmayı dener. */
import { writeFileSync } from "node:fs";

const URL_ = process.argv[2] ?? "https://x.com/EkremErayArda/status/2097310446495658234";
const out = [];

const r = await fetch(URL_, {
  headers: { "user-agent": "ErayArdaSite/1.0 (+link-preview)", accept: "text/html" },
});
const html = await r.text();
out.push(`HTTP ${r.status} | ${html.length} bayt`);

const i = html.indexOf("note_tweet_results");
if (i < 0) {
  out.push("note_tweet_results yok — kısa gönderi");
} else {
  const blok = html.slice(i, i + 6000);
  // React Server Component payload'u: text:"..." biçiminde, JS kaçışlarıyla.
  const m = blok.match(/text:"((?:[^"\\]|\\.)*)"/);
  out.push("text alanı: " + (m ? "bulundu" : "BULUNAMADI"));
  if (m) {
    let s = m[1];
    // \n, \" ve \uXXXX kaçışlarını çöz
    s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
         .replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    out.push(`uzunluk: ${s.length}`);
    out.push("--- metin ---");
    out.push(s);
  } else {
    out.push("blok örneği:");
    out.push(blok.slice(0, 800));
  }
}
writeFileSync("rapor.txt", out.join("\n"), "utf8");

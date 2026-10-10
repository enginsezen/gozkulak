// Sayaçlar: ekrana gelince 0'dan sayan rakamlar son değerleriyle okunur. Böylece okunan metin (ve hazır
// sesin dosya adı) ziyaretçinin ne zaman dinlediğine bağlı olmaz. Sayaç sayarken vurgu kaybolmaz.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const FAKE = readFileSync(__f(new globalThis.URL("./fake-speech.js", import.meta.url)), "utf8");
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addInitScript(FAKE);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-oku/sayac.html");
await p.waitForFunction(() => window.GozKulak);
const speech = () => p.evaluate(() => GozKulak.sentences().map((s) => s.speech));
const before = await speech();
for (const s of before) console.log("  " + s);
const want = ["Müşteri Memnuniyeti.", "yüzde 100.", "Tamamlanan Proje.", "1250.", "Destek ekibimize buradan ulaşabilirsiniz.", "Kuruluş yılımız 1996 olarak kayıtlıdır."];
// Son cümle: öznitelik değeri rakam değilse öğe sayaç sayılmaz.
const miss = want.filter((w) => !before.some((s) => s.includes(w)));
if (miss.length) errs.push("beklenen okunuş yok: " + miss.join(" | "));
const units1 = await p.evaluate(() => GozKulak.units());
await p.evaluate(() => window.startCounters());
await p.waitForTimeout(700);
const during = await speech();
if (JSON.stringify(during) !== JSON.stringify(before)) errs.push("sayaç sayarken okunuş değişti: " + during.join(" | "));
const units2 = await p.evaluate(() => GozKulak.units());
if (JSON.stringify(units1) !== JSON.stringify(units2)) errs.push("hazır ses dosya adları değişti");
// Okuma sayacın cümlesindeyken sayaç yeniden sayar: vurgu yine sayacı kapsamalı.
await p.evaluate(() => { document.querySelector("[data-to-value]").textContent = "0"; GozKulak.open(); });
await p.evaluate(() => document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-play").click());
const hl = () => p.evaluate(() => { const h = CSS.highlights.get("gk-read"); const r = h && [...h][0]; return r ? r.toString() : null; });
let seen = null;
for (let i = 0; i < 80 && !seen; i++) {
	const t = await hl();
	if (t && /^\d+\s*%$/.test(t.trim()) && t.trim() !== "0%") seen = t;
	if (t === "Müşteri Memnuniyeti") await p.evaluate(() => window.startCounters());
	await p.waitForTimeout(25);
}
console.log("sayaç sayarken vurgu:", JSON.stringify(seen));
if (!seen) errs.push("sayaç cümlesi vurgulanmadı");
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

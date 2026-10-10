// Açılıp kapanan bölümler (akordeon, <details>, sekme): hazırlama (GozKulak.unitsAll) kapalı panelleri de
// açılmış hâlleriyle tarar. Ziyaretçi hangi paneli açarsa açsın okunacak birimlerin hepsi hazırlanmış
// kümede olmalı; tarama sayfayı değiştirmemeli.
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-oku/panel.html");
await p.waitForFunction(() => window.GozKulak);
const html = () => p.evaluate(() => document.querySelector("main").outerHTML);
const before = await html();
const first = await p.evaluate(async () => (await GozKulak.units()).map((u) => u.hash));
const all = await p.evaluate(async () => [...new Map((await GozKulak.unitsAll()).map((u) => [u.hash, u.text])).entries()]);
const ready = new Set(all.map((x) => x[0]));
console.log("sayfa açıldığında birim:", first.length, "| hazırlanacak (bütün hâller):", ready.size);
for (const [, t] of all) console.log("  " + t);
if ((await html()) !== before) errs.push("tarama sayfayı değiştirdi");
const again = await p.evaluate(async () => (await GozKulak.units()).map((u) => u.hash));
if (JSON.stringify(again) !== JSON.stringify(first)) errs.push("taramadan sonra okunan birimler değişti");
for (const t of ["Hosting hizmeti", "Türkiye'nin her yerine", "İhtiyaç analizinden", "Bireysel paketler"]) if (!all.some(([, x]) => x.includes(t))) errs.push("kapalı panel hazırlanmadı: " + t);

// Ziyaretçi gibi: her başlığa tıkla, okunacak birimler hazırlanmış kümede mi
for (const sel of ["#t2", "#t3", "#t1", "#t1", "details > summary", "[aria-controls=p2]"]) {
	await p.click(sel);
	await p.waitForTimeout(100);
	const now = await p.evaluate(async () => (await GozKulak.units()).map((u) => [u.hash, u.text]));
	const lost = now.filter(([h]) => !ready.has(h)).map((x) => x[1]);
	console.log(sel + " tıklandı: " + now.length + " birim, hazırda olmayan: " + lost.length);
	if (lost.length) errs.push(sel + " açıkken hazırlanmamış birim: " + lost.join(" | "));
}
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

// Koyu mod kalıcılığı: sayfa değişince (gövde sınıfı, fareyle üzerine gelme) yapılan kısmi taramadan sonra
// renkler aynı kalmalı. Eskiden ölçüm işareti ("gk-pm") 22. renk kuralıyla aynı adı taşıyordu; sayfada
// 23'ten fazla renk kuralı olunca kısmi tarama bütün renkleri yanlış ölçüp koyu mod renklerini siliyordu.
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-mock/renkler.html");
await p.evaluate(() => localStorage.setItem("gozkulak:v1", JSON.stringify({ darkMode: true })));
await p.reload();
await p.waitForTimeout(2500);
const colors = () => p.evaluate(() => [...document.querySelectorAll("body, header, h1, main, main p")].map((el) => { const cs = getComputedStyle(el); return cs.color + " / " + cs.backgroundColor; }));
const lum = (s) => { const [r, g, b] = s.match(/\d+/g).map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const before = await colors();
const rules = await p.evaluate(() => new Set([...document.querySelectorAll("[class*='gk-p']")].flatMap((el) => [...el.classList].filter((c) => c.startsWith("gk-p")))).size);
console.log("renk kuralı sınıfı:", rules);
const dark = before.filter((s) => lum(s.split(" / ")[0]) < 0.55).length;
if (rules <= 23) errs.push("sayfa 23'ten fazla renk kuralı oluşturmalı (" + rules + ")");
if (dark) errs.push("koyu modda koyu yazı kaldı: " + dark);

// Kaydırınca temaların yaptığı gibi gövdeye sınıf eklenir: bütün sayfa kısmi taramayla yeniden okunur.
await p.evaluate(() => document.body.classList.add("kaydirildi"));
await p.waitForTimeout(800);
for (const sel of ["main p:nth-child(3)", "main p:nth-child(30)", "h1"]) {
	await p.hover(sel);
	await p.waitForTimeout(500);
}
await p.mouse.move(5, 5);
await p.waitForTimeout(800);
const after = await colors();
const changed = after.filter((s, i) => s !== before[i]);
console.log("değişen öğe:", changed.length, "/", after.length);
if (changed.length) errs.push("kısmi taramadan sonra renk değişti: " + changed.slice(0, 3).join(" | "));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

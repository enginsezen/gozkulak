import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-mock/perf.html");
await p.evaluate(() => localStorage.removeItem("gozkulak:v1"));
await p.reload();
await p.waitForTimeout(500);
console.log("öğe sayısı:", await p.evaluate(() => document.querySelectorAll("body *").length));
const sh = (fn, arg) => p.evaluate(([f, a]) => { const host = document.querySelector("gozkulak-root"); return new Function("host", "root", "a", f)(host, host.shadowRoot, a); }, [fn, arg]);
await sh(`root.querySelector('.gk-btn').click(); return 1;`);
for (const label of ["Koyu mod", "Koyu mod", "Yüksek kontrast", "Koyu mod"]) {
	const ms = await sh(`const t = [...root.querySelectorAll('.gk-tile')].find(t => t.querySelector('.gk-tile-label').textContent === a); const s = performance.now(); t.click(); return Math.round(performance.now() - s);`, label);
	await p.waitForTimeout(300);
	console.log(label, "→", ms, "ms | sınıf sayısı:", await p.evaluate(() => document.querySelectorAll("[class*='gk-p']").length));
}
// Dinamik ekleme: 50 kart eklenince tarama süresi
const t = await p.evaluate(async () => {
	const host = document.getElementById("Wrapper");
	for (let i = 0; i < 50; i++) { const d = document.createElement("div"); d.className = "card"; d.style.cssText = "background:#fff;border:1px solid #ccc"; d.textContent = "yeni " + i; host.prepend(d); }
	await new Promise((r) => setTimeout(r, 600));
	return getComputedStyle(host.firstElementChild).backgroundColor;
});
console.log("sonradan eklenen kart zemini:", t);
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

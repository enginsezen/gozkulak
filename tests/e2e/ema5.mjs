// Gecikmeli ama hızlı motor: ses arada bitse de tarayıcı sesine geçilmez. Yavaş motorda test modunda
// geçişin teknik nedeni notta görünür.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const FAKE = readFileSync(__T + "/e2e/fake-speech.js", "utf8");
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errs = [];
async function open(q) {
	const c = await b.newContext();
	await c.addInitScript(FAKE);
	const p = await c.newPage();
	p.on("pageerror", (e) => errs.push(e.message));
	await p.goto("http://127.0.0.1:8080/gk-tts/page.php?" + q);
	await p.waitForFunction(() => window.GozKulak);
	await p.evaluate(() => GozKulak.open());
	return p;
}
const sh = (p, fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
const start = async (p) => {
	await sh(p, "root.querySelector('.gk-play').click();");
	await p.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden);
	await sh(p, "root.querySelector('.gk-ask-yes').click();");
};
const tile = (p) => sh(p, "const t = [...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes('Doğal ses')); return t.getAttribute('aria-pressed');");

let p = await open("w=worker-lag.js&b=main");
await start(p);
await p.waitForTimeout(25000);
console.log("gecikmeli motor: tarayıcı sesi konuştu mu:", (await p.evaluate(() => window.__spoken.length)) > 0, "| doğal ses açık:", await tile(p), "|", await sh(p, "return root.querySelector('.gk-tts-status').textContent + ' | ' + root.querySelector('.gk-tts-note').textContent;"));

p = await open("w=worker-slow.js&b=main");
await start(p);
await p.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 60000 });
console.log("yavaş motor notu:", await sh(p, "return root.querySelector('.gk-tts-note').textContent;"));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

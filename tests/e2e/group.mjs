// Kısa cümlelerin birlikte üretilmesi, vurgunun sırayla geçmesi, başta biriktirme.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const SPY = `(() => { window.__posts = []; const o = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, t) { try { if (m.cmd === "synth") window.__posts.push(m.text); } catch (e) {} return o.call(this, m, t); }; })();`;
const AUDIO = `(() => { window.__first = 0; const o = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.length > 1 && !window.__first) window.__first = performance.now(); return o.apply(this, a); }; })();`;
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const c = await b.newContext();
await c.addInitScript(FAKE); await c.addInitScript(SPY); await c.addInitScript(AUDIO);
const p = await c.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-tts/page.php?b=main");
await p.waitForFunction(() => window.GozKulak);
await p.evaluate(() => GozKulak.open());
const sh = (fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
await sh("root.querySelector('.gk-play').click();");
await p.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden);
const t0 = await p.evaluate(() => performance.now());
await sh("root.querySelector('.gk-ask-yes').click();");
const seen = [];
for (let k = 0; k < 400; k++) {
	const h = await p.evaluate(() => { const x = CSS.highlights.get("gk-read"); return x ? [...x][0].toString().slice(0, 25) : null; });
	if (h && seen[seen.length - 1] !== h) seen.push(h);
	if (await sh("return root.querySelector('.gk-play-label').textContent === 'Sayfayı dinle';") && k > 5) break;
	await p.waitForTimeout(150);
}
console.log("ilk sese kadar (indirme dahil):", Math.round((await p.evaluate(() => window.__first)) - t0), "ms");
console.log("üretim işleri:", JSON.stringify(await p.evaluate(() => window.__posts)));
console.log("vurgu sırası:", JSON.stringify(seen));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

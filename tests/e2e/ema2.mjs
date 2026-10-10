import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const SPY = `(() => { window.__posts = []; const o = Worker.prototype.postMessage; Worker.prototype.postMessage = function (m, t) { try { window.__posts.push({ cmd: m.cmd, speed: m.speed, text: m.text && m.text.slice(0, 25), gpu: m.gpu, base: m.base }); } catch (e) {} return o.call(this, m, t); }; })();`;
const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(FAKE);
await ctx.addInitScript(SPY);
const sh = (p, fn, arg) => p.evaluate(([f, a]) => new Function("root", "a", f)(document.querySelector("gozkulak-root").shadowRoot, a), [fn, arg]);
async function open(url) {
	const p = await ctx.newPage();
	p.on("pageerror", (e) => errs.push(e.message));
	p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); if (m.type() === "warning") console.log("  [uyarı] " + m.text().slice(0, 200)); });
	await p.goto(url);
	await p.waitForFunction(() => window.GozKulak);
	return p;
}
// 1) Tıklayarak dinle, panel kapalı → onay paneli açılır
let p = await open("http://127.0.0.1:8080/gk-tts/page.php?b=main");
await p.evaluate(() => GozKulak.open());
await sh(p, "[...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes('Tıklayarak')).click(); return 1;");
await p.keyboard.press("Escape");
await p.waitForTimeout(100);
await p.click("main p:nth-of-type(2)");
await p.waitForTimeout(700);
console.log("tıklayınca:", await sh(p, "return JSON.stringify({ panel: !root.querySelector('#gk-panel').hidden, onay: !root.querySelector('.gk-ask').hidden, odak: root.activeElement && root.activeElement.className });"));
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await p.waitForTimeout(2500);
console.log("tıklanan yerden:", await p.evaluate(() => { const h = CSS.highlights.get("gk-read"); return h ? [...h][0].toString().slice(0, 40) : null; }));
// 2) Hız değişince yeniden üretilir
await sh(p, "root.querySelector('.gk-speech .gk-step-up').click(); return 1;");
await p.waitForTimeout(800);
const synths = await p.evaluate(() => __posts.filter((x) => x.cmd === "synth" || x.cmd === "cancel").map((x) => x.cmd + (x.speed ? "@" + x.speed : "")).join(" "));
console.log("worker mesajları:", synths);
console.log("yükleme:", await p.evaluate(() => JSON.stringify(__posts.find((x) => x.cmd === "load"))));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
await p.close();

// 3) WordPress: gerçek eklenti dosyası, gerçek özetler (sandbox HF'ye ulaşamaz) → tarayıcı sesine geçer
{ const l = await ctx.newPage(); await l.goto("http://localhost:8080/wp-login.php"); await l.fill("#user_login", "admin"); await l.fill("#user_pass", "admin"); await l.click("#wp-submit"); await l.waitForLoadState("networkidle"); await l.close(); }
p = await open("http://localhost:8080/?p=6");
await p.evaluate(() => GozKulak.open());
console.log("\nWP doğal ses kutusu:", await sh(p, "const t = [...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes('Doğal ses')); return t ? t.getAttribute('aria-pressed') : 'yok';"));
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(1500);
console.log("WP onay:", await sh(p, "return root.querySelector('.gk-ask').hidden ? 'yok' : 'var';"));
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await p.waitForFunction(() => (window.__spoken || []).length > 0, null, { timeout: 60000 }).catch(() => {});
console.log("WP sonuç:", await sh(p, "return root.querySelector('.gk-tts-status').textContent;"));
await p.close();
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

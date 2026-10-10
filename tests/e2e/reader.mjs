import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const AXE = readFileSync(S + "/node_modules/axe-core/axe.min.js", "utf8");
const BASE = "http://127.0.0.1:8080/gk-oku/";
const b = await chromium.launch();
const errs = [];
async function open(file, opts = {}) {
	const ctx = await b.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
	await ctx.addInitScript(FAKE);
	const p = await ctx.newPage();
	p.on("pageerror", (e) => errs.push(file + ": " + e.message));
	p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(file + " " + m.type() + ": " + m.text()); });
	await p.goto(BASE + file);
	await p.waitForFunction(() => window.GozKulak && getComputedStyle(document.querySelector("gozkulak-root")).display !== "none");
	return p;
}
const sh = (p, fn, arg) => p.evaluate(([f, a]) => new Function("root", "a", f)(document.querySelector("gozkulak-root").shadowRoot, a), [fn, arg]);
const spoken = (p) => p.evaluate(() => window.__spoken.map((x) => x.text));

// 1) Cümleler: her tema
for (const f of ["listeo.html", "betheme.html", "blocksy.html", "en.html", "auto.html"]) {
	const p = await open(f);
	const list = await p.evaluate(() => GozKulak.sentences());
	console.log("\n### " + f + " (" + list.length + " cümle)");
	for (const x of list) console.log("  [" + x.lang + "] " + x.text + (x.text !== x.speech ? "\n        → " + x.speech : ""));
	await p.context().close();
}

// 2) Okuma akışı, vurgulama, duraklat/devam, ileri/geri, mini oynatıcı
const p = await open("listeo.html");
await p.evaluate(() => GozKulak.open());
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(120);
const hl = () => p.evaluate(() => { const h = CSS.highlights.get("gk-read"); if (!h) return null; const r = [...h][0]; return r.toString().slice(0, 40); });
console.log("\nokuma başladı | vurgu:", await hl(), "| durum:", await sh(p, "return root.querySelector('.gk-tts-status').textContent;"));
await p.waitForTimeout(700);
console.log("~0,8 sn sonra okunan:", (await spoken(p)).length, "| vurgu:", await hl());
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
const pausedAt = (await spoken(p)).length;
await p.waitForTimeout(800);
console.log("duraklat: okunan sabit mi:", (await spoken(p)).length === pausedAt, "| düğme:", await sh(p, "return root.querySelector('.gk-play-label').textContent;"), "| durum:", await sh(p, "return root.querySelector('.gk-tts-status').textContent;"));
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(100);
const sp = await spoken(p);
console.log("devam: aynı cümleden mi:", sp[sp.length - 1] === sp[pausedAt - 1], "→", sp[sp.length - 1].slice(0, 40));
await sh(p, "root.querySelectorAll('.gk-ctl')[1].click(); return 1;");
await p.waitForTimeout(100);
console.log("sonraki cümle:", (await spoken(p)).slice(-1)[0].slice(0, 50));
// Panel kapat → mini oynatıcı
await p.keyboard.press("Escape");
await p.waitForTimeout(100);
console.log("mini oynatıcı:", await sh(p, "const m = root.querySelector('.gk-mini'); return m.hidden ? 'gizli' : 'görünür ' + m.querySelector('.gk-mini-pos').textContent;"));
await p.screenshot({ path: S + "/shots/oku-mini.png" });
await sh(p, "root.querySelectorAll('.gk-mini-btn')[3].click(); return 1;");
await p.waitForTimeout(100);
console.log("mini durdur:", await sh(p, "return root.querySelector('.gk-mini').hidden;"), "| vurgu temizlendi:", (await hl()) === null);
// Bitince durum
await p.evaluate(() => { window.__spoken = []; window.__speakMs = 40; });
await p.evaluate(() => GozKulak.open());
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(2500);
console.log("tümü okundu:", (await spoken(p)).length, "cümle | son durum:", await sh(p, "return root.querySelector('.gk-play-label').textContent + ' / ' + root.querySelector('.gk-tts-status').textContent;"));
// Hız
await p.evaluate(() => { window.__spoken = []; window.__speakMs = 250; });
await sh(p, "root.querySelector('.gk-speech .gk-step-up').click(); return 1;");
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(100);
console.log("hız:", await sh(p, "return root.querySelector('.gk-rate-value').textContent;"), "| konuşma hızı:", await p.evaluate(() => window.__spoken[0].rate), "| kayıt:", await p.evaluate(() => localStorage.getItem("gozkulak:v1")));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
// Seçili metin
await p.evaluate(() => { window.__spoken = []; const r = document.createRange(); const t = document.querySelector("#p2"); r.setStart(t.firstChild, 0); r.setEnd(t.lastChild, t.lastChild.length); getSelection().removeAllRanges(); getSelection().addRange(r); });
await sh(p, "root.querySelector('.gk-play').click(); return 1;");
await p.waitForTimeout(700);
console.log("seçim okundu:", JSON.stringify(await spoken(p)));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
await p.evaluate(() => getSelection().removeAllRanges());
// Tıklayarak dinle
await sh(p, "[...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes('Tıklayarak')).click(); return 1;");
await p.keyboard.press("Escape");
await p.evaluate(() => { window.__spoken = []; });
const box = await p.evaluate(() => { const r = document.createRange(); const t = document.querySelector("#p1").firstChild; r.setStart(t, 190); r.setEnd(t, 200); const b = r.getBoundingClientRect(); return [b.left + 2, b.top + b.height / 2]; });
await p.mouse.click(box[0], box[1]);
await p.waitForTimeout(150);
console.log("tıklanan yerden:", (await spoken(p))[0]);
await p.evaluate(() => { window.__spoken = []; });
await p.click("a.listing-address", { noWaitAfter: true }).catch(() => {});
await p.waitForTimeout(150);
console.log("bağlantıya tıklayınca okuma başlamadı mı:", (await spoken(p)).length === 0 || "(okuma sürüyordu)");
// axe ve sekme sırası
await p.evaluate(() => GozKulak.open());
await p.addScriptTag({ content: AXE });
console.log("axe (panel açık, okuma sürerken):", JSON.stringify(await p.evaluate(async () => (await axe.run({ include: [["gozkulak-root"]] }, { resultTypes: ["violations"] })).violations.map((v) => v.id + ": " + v.nodes.length))));
await p.screenshot({ path: S + "/shots/oku-panel.png" });
await p.context().close();

// 3) İngilizce sayfa: ses dili
const e = await open("en.html");
await e.evaluate(() => GozKulak.open());
await sh(e, "root.querySelector('.gk-play').click(); return 1;");
await e.waitForTimeout(150);
console.log("\nİngilizce:", JSON.stringify(await e.evaluate(() => window.__spoken[0])), "| panel dili:", await sh(e, "return root.querySelector('.gk-play-label').textContent;"));
await e.context().close();

// 4) Ses yoksa
const n = await open("listeo.html");
await n.evaluate(() => { speechSynthesis.getVoices = () => []; });
await n.evaluate(() => GozKulak.open());
await sh(n, "root.querySelector('.gk-play').click(); return 1;");
await n.waitForTimeout(1800);
console.log("ses yokken:", await sh(n, "return root.querySelector('.gk-tts-status').textContent;"));
await n.context().close();

console.log("\nHATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

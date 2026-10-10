// Doğal ses (EMA) akışı: gerçek ONNX Runtime 1.30.0 + sahte küçük modeller, gerçek Worker.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const AXE = readFileSync(S + "/node_modules/axe-core/axe.min.js", "utf8");
const AUDIO = `(() => {
	window.__audio = { starts: 0, sec: 0 };
	const o = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...a) {
		if (this.buffer && this.buffer.length > 1) { __audio.starts++; __audio.sec += this.buffer.duration; }
		return o.apply(this, a);
	};
	const OC = window.AudioContext;
	window.AudioContext = class extends OC { constructor(...a) { super(...a); window.__ctx = this; } };
})();`;
const URL0 = "http://127.0.0.1:8080/gk-tts/page.php";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errs = [];
let ctx;

async function open(query, { fresh = false, speech = true } = {}) {
	if (fresh || !ctx) {
		if (ctx) await ctx.close();
		ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
		if (speech) await ctx.addInitScript(FAKE);
		await ctx.addInitScript(AUDIO);
	}
	const p = await ctx.newPage();
	p.__req = [];
	p.on("request", (r) => { if (/gk-tts\/.*(onnx|wasm|mjs|json)$/.test(r.url())) p.__req.push(r.url().replace("http://127.0.0.1:8080/gk-tts/", "")); });
	p.on("pageerror", (e) => errs.push(query + ": " + e.message));
	p.on("console", (m) => { if (m.type() === "error") errs.push(query + " console: " + m.text()); if (m.type() === "warning") p.__warn = (p.__warn || []).concat(m.text()); });
	await p.goto(URL0 + "?" + query);
	await p.waitForFunction(() => window.GozKulak);
	return p;
}
const sh = (p, fn, arg) => p.evaluate(([f, a]) => new Function("root", "a", f)(document.querySelector("gozkulak-root").shadowRoot, a), [fn, arg]);
const status = (p) => sh(p, "return root.querySelector('.gk-tts-status').textContent + ' ' + root.querySelector('.gk-tts-note').textContent;");
const label = (p) => sh(p, "return root.querySelector('.gk-play-label').textContent;");
const hl = (p) => p.evaluate(() => { const h = CSS.highlights.get("gk-read"); return h ? [...h][0].toString().slice(0, 30) : null; });
const clickPlay = (p) => sh(p, "root.querySelector('.gk-play').click(); return 1;");
const tileState = (p, txt) => sh(p, "const t = [...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes(a)); return t ? t.getAttribute('aria-pressed') : 'yok';", txt);
const waitState = (p, fn, ms = 15000) => p.waitForFunction(fn, null, { timeout: ms });

// 1) İlk kullanım: onay sorulur, onaydan önce model dosyası inmez
let p = await open("b=main", { fresh: true });
await p.evaluate(() => GozKulak.open());
console.log("doğal ses kutusu:", await tileState(p, "Doğal ses"));
await clickPlay(p);
await p.waitForTimeout(600);
const ask = await sh(p, "const k = root.querySelector('.gk-ask'); return { görünür: !k.hidden, metin: k.querySelector('p').textContent.slice(0, 60), hayır: k.querySelector('.gk-ask-no').textContent, odak: root.activeElement && root.activeElement.textContent };");
console.log("onay kutusu:", JSON.stringify(ask), "| düğme:", await label(p));
console.log("onaydan önce indirilen dosya:", p.__req.length ? p.__req.join(", ") : "yok");
// axe: onay kutusu açıkken
await p.evaluate(AXE);
const ax = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa"] }); return r.violations.map((v) => v.id + " (" + v.nodes.length + ")"); });
console.log("axe (onay kutusu):", ax.length ? ax.join(", ") : "ihlal yok");

// 2) İndir ve dinle
const t0 = Date.now();
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await p.waitForTimeout(50);
console.log("yükleniyor:", await label(p), "|", await status(p));
await waitState(p, () => window.__audio && window.__audio.starts > 0);
console.log("ilk ses:", Date.now() - t0, "ms | indirilenler:", p.__req.length, "dosya:", p.__req.map((u) => u.split("/").pop()).join(", "));
await p.waitForTimeout(300);
console.log("odak:", await sh(p, "return root.activeElement ? root.activeElement.className : 'yok';"));
console.log("okunuyor:", await label(p), "|", await status(p), "| vurgu:", await hl(p), "| ctx:", await p.evaluate(() => __ctx.state));
await p.waitForTimeout(2500);
console.log("2,5 sn sonra: vurgu:", await hl(p), "|", await status(p), "| ses:", await p.evaluate(() => __audio.starts + " parça, " + __audio.sec.toFixed(1) + " sn"));
// Duraklat / devam
await clickPlay(p);
await p.waitForTimeout(200);
const tP = await p.evaluate(() => __ctx.currentTime);
await p.waitForTimeout(700);
console.log("duraklat:", await label(p), "| ctx:", await p.evaluate(() => __ctx.state), "| zaman sabit:", Math.abs((await p.evaluate(() => __ctx.currentTime)) - tP) < 0.01, "|", await status(p));
await clickPlay(p);
await p.waitForTimeout(400);
console.log("devam:", await label(p), "| ctx:", await p.evaluate(() => __ctx.state), "| zaman ilerliyor:", (await p.evaluate(() => __ctx.currentTime)) > tP);
// Sonraki cümle
const before = await hl(p);
await sh(p, "root.querySelectorAll('.gk-ctl')[1].click(); return 1;");
await p.waitForTimeout(150);
console.log("sonraki:", before, "→", await hl(p));
// Mini oynatıcı
await p.keyboard.press("Escape");
await p.waitForTimeout(100);
console.log("mini:", await sh(p, "const m = root.querySelector('.gk-mini'); return (m.hidden ? 'gizli' : 'görünür ' + m.querySelector('.gk-mini-pos').textContent) + ' | ' + m.getAttribute('aria-label');"));
await p.screenshot({ path: S + "/shots/ema-mini.png" });
// Sonuna kadar
await waitState(p, () => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-mini").offsetParent && !CSS.highlights.get("gk-read"), 30000);
await p.evaluate(() => GozKulak.open());
console.log("bitti:", await label(p), "|", await status(p), "| ctx:", await p.evaluate(() => __ctx.state));
await p.close();

// 3) Yeni sayfa: dosyalar önbellekte, onay sorulmaz, ağdan inmez
p = await open("b=main");
await p.evaluate(() => GozKulak.open());
const t1 = Date.now();
await clickPlay(p);
await waitState(p, () => window.__audio && window.__audio.starts > 0);
console.log("\nönbellekten: ilk ses", Date.now() - t1, "ms | onay:", await sh(p, "return root.querySelector('.gk-ask').hidden ? 'sorulmadı' : 'soruldu';"), "| ağdan inen:", p.__req.length ? p.__req.join(", ") : "yok");
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
// Hız değişince yeniden
await p.close();

// 4) Kendi sunucuda bozuk/eksik dosya → yedek kaynaktan
p = await open("b=bad", { fresh: true });
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(400);
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await waitState(p, () => window.__audio && window.__audio.starts > 0);
console.log("\nbozuk kaynak → yedek:", p.__req.map((u) => u.replace(/ema-lightning-onnx\/13c431d\/|onnxruntime-web\/1.30.0\//, "…/")).join(", "));
console.log("durum:", await status(p));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
await p.close();

// 5) Hiçbir kaynak yok → tarayıcının sesiyle
p = await open("b=broken", { fresh: true });
// yedek kaynağı da kır: alt klasörü geçici olarak engelle
await p.route("**/gk-tts/alt/**", (r) => r.fulfill({ status: 404, body: "yok" }));
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(400);
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await p.waitForTimeout(2500);
console.log("\nkaynak yok:", await label(p), "|", await status(p), "| tarayıcı sesi:", (await p.evaluate(() => window.__spoken.length)) > 0, "| uyarı:", (p.__warn || []).join(" / ").slice(0, 160));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
await p.close();

// 6) Onay kutusunda "Tarayıcının sesiyle dinle"
p = await open("b=main", { fresh: true });
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(400);
await sh(p, "root.querySelector('.gk-ask-no').click(); return 1;");
await p.waitForTimeout(400);
console.log("\nreddetti:", await label(p), "| tarayıcı sesi:", (await p.evaluate(() => window.__spoken.length)) > 0, "| doğal ses kutusu:", await tileState(p, "Doğal ses"), "| inen:", p.__req.length);
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
// Doğal sesi yeniden aç → okuma sürüyorsa yeni sesle
await sh(p, "[...root.querySelectorAll('.gk-tile')].find(t => t.textContent.includes('Doğal ses')).click(); return 1;");
console.log("yeniden açıldı:", await tileState(p, "Doğal ses"));
await p.close();

// 7) İndirme sırasında iptal
p = await open("b=main", { fresh: true });
await p.route("**/text.onnx", async (r) => { await new Promise((x) => setTimeout(x, 3000)); r.continue(); });
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(400);
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
await p.waitForTimeout(600);
console.log("\nindiriliyor:", await label(p), "|", await status(p), "| çubuk:", await sh(p, "const b = root.querySelector('.gk-tts-progress'); return b.hidden ? 'gizli' : b.value;"));
await clickPlay(p);
await p.waitForTimeout(300);
console.log("iptal:", await label(p), "|", await status(p));
await p.waitForTimeout(3500);
console.log("iptalden sonra ses:", await p.evaluate(() => window.__audio.starts));
await p.close();

// 8) Yavaş cihaz → tarayıcının sesine geçer, tercih kaydedilir
p = await open("w=worker-slow.js&b=main", { fresh: true });
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(400);
await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
const tS = Date.now();
await p.evaluate(() => { window.__speakMs = 1500; });
await waitState(p, () => [...document.querySelector("gozkulak-root").shadowRoot.querySelectorAll(".gk-tile")].some((t) => t.textContent.includes("Doğal ses") && t.getAttribute("aria-pressed") === "false"), 30000);
console.log("\nyavaş: geçiş", Date.now() - tS, "ms sonra");
await p.waitForTimeout(100);
console.log("yavaş:", await label(p), "|", await status(p), "| tarayıcı sesi:", (await p.evaluate(() => window.__spoken.length)) > 0, "| doğal ses kutusu:", await tileState(p, "Doğal ses"), "| kayıt:", await p.evaluate(() => localStorage.getItem("gozkulak:v1")));
await sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
await p.close();

// 9) Tarayıcı sesi yokken onay kutusu "Vazgeç" der
p = await open("b=main", { fresh: true, speech: false });
await p.evaluate(() => { Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true }); });
await p.evaluate(() => GozKulak.open());
await clickPlay(p);
await p.waitForTimeout(2500);
console.log("\nses yok, onay:", await sh(p, "return root.querySelector('.gk-ask-no').textContent;"));
await sh(p, "root.querySelector('.gk-ask-no').click(); return 1;");
await p.waitForTimeout(200);
console.log("vazgeç:", await label(p), "| kutu:", await sh(p, "return root.querySelector('.gk-ask').hidden ? 'kapandı' : 'açık';"));
await p.close();

console.log("\nHATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

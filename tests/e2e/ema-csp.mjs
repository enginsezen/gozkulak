// Güvenlik başlığı (CSP) uyumu: sayfa ve Worker aynı başlıkla sunulur (gerçek sitelerde nginx başlığı
// bütün yanıtlara ekler). Önerilen kuralda her şey ihlalsiz çalışır; daha katı kurallarda menü çalışır,
// okuma bir sonraki sese düzgünce geçer. Gerçek ONNX Runtime + sahte modeller, gerçek Worker.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const FAKE = readFileSync(__T + "/e2e/fake-speech.js", "utf8");
const SPY = `(() => {
	window.__audio = { starts: 0 };
	window.__media = 0;
	window.__csp = [];
	const o = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...a) {
		if (this.buffer && this.buffer.length > 1) __audio.starts++;
		return o.apply(this, a);
	};
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		window.__media++;
		return play.call(this);
	};
	document.addEventListener("securitypolicyviolation", (e) => __csp.push(e.effectiveDirective + " " + (e.blockedURI || "")));
})();`;
const URL0 = "http://127.0.0.1:8080/gk-tts/page.php";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errs = [];
const check = (name, ok, info) => {
	console.log((ok ? "✓ " : "✗ ") + name + (info ? " — " + info : ""));
	if (!ok) errs.push(name);
};

async function open(query) {
	const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
	await ctx.addInitScript(FAKE);
	await ctx.addInitScript(SPY);
	const p = await ctx.newPage();
	p.__req = [];
	p.__err = [];
	p.on("request", (r) => { if (/gk-tts\/.*(onnx|wasm|mjs|json)$/.test(r.url())) p.__req.push(r.url().replace("http://127.0.0.1:8080/gk-tts/", "")); });
	p.on("pageerror", (e) => p.__err.push(e.message));
	await p.goto(URL0 + "?" + query);
	await p.waitForFunction(() => window.GozKulak, null, { timeout: 10000 });
	await p.evaluate(() => GozKulak.open());
	return p;
}
const q = (p, sel) => p.evaluate((s) => { const e = document.querySelector("gozkulak-root").shadowRoot.querySelector(s); return e ? { text: e.textContent, hidden: e.hidden } : null; }, sel);
const click = (p, sel) => p.evaluate((s) => document.querySelector("gozkulak-root").shadowRoot.querySelector(s).click(), sel);
const askShown = async (p) => !(await q(p, ".gk-ask")).hidden;
const note = async (p) => ((await q(p, ".gk-tts-status")).text + " " + (await q(p, ".gk-tts-note")).text).trim();
const wait = (p, fn, ms = 20000) => p.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
const done = async (p) => {
	const r = { csp: await p.evaluate(() => window.__csp), err: p.__err };
	await p.context().close();
	return r;
};

// Hazır ses listesi için sayfanın birimleri
let p = await open("csp=onerilen");
const hashes = (await p.evaluate(async () => (await GozKulak.units()).map((u) => u.hash))).join(",");
await done(p);
check("sayfanın birimleri alındı", hashes.length > 0, hashes.split(",").length + " birim");

// 1) Önerilen kural, doğal ses: onay → indirme → ses, ihlal yok
p = await open("csp=onerilen");
await click(p, ".gk-play");
await wait(p, () => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, 10000);
await click(p, ".gk-ask-yes");
let ok = await wait(p, () => window.__audio.starts > 0);
let r = await done(p);
check("önerilen: doğal sesle okunur", ok);
check("önerilen: ihlal ve hata yok (doğal ses)", !r.csp.length && !r.err.length, r.csp.concat(r.err).join(" | "));

// 2) Önerilen kural, hazır ses: onaysız, <audio> ile, ihlal yok
p = await open("csp=onerilen&files=" + hashes);
await click(p, ".gk-play");
ok = await wait(p, () => window.__media > 0, 10000);
const ask2 = await askShown(p);
const n2 = await note(p);
r = await done(p);
check("önerilen: hazır sesle okunur", ok && !ask2 && /hazır ses/.test(n2), n2);
check("önerilen: ihlal ve hata yok (hazır ses)", !r.csp.length && !r.err.length, r.csp.concat(r.err).join(" | "));

// 3) Katı kural (WebAssembly ve blob: modülü yok): doğal ses indirmeden önce bırakılır, tarayıcı sesi okur
p = await open("csp=katı");
await click(p, ".gk-play");
await wait(p, () => (window.__spoken || []).length > 0 || !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, 10000);
const ask3 = await askShown(p);
ok = await wait(p, () => (window.__spoken || []).length > 0, 10000);
const n3 = await note(p);
const req3 = p.__req.slice();
r = await done(p);
check("katı: onay sorulmaz, tarayıcının sesiyle okunur", !ask3 && ok, n3);
check("katı: model dosyası inmez", !req3.some((u) => /\.onnx$/.test(u)), req3.join(", "));
check("katı: sayfada hata yok", !r.err.length, r.err.join(" | ") + " | ihlaller: " + r.csp.join(", "));

// 4) Katı kural, hazır ses: model gerekmez, hazır ses çalışır
p = await open("csp=katı&files=" + hashes);
await click(p, ".gk-play");
ok = await wait(p, () => window.__media > 0, 10000);
const n4 = await note(p);
r = await done(p);
check("katı: hazır sesle okunur", ok && /hazır ses/.test(n4), n4);
check("katı: ihlal ve hata yok (hazır ses)", !r.csp.length && !r.err.length, r.csp.concat(r.err).join(" | "));

// 5) blob: medyası yasak: hazır ses çalınamaz, okuma doğal sesle sürer
p = await open("csp=medyasız&files=" + hashes);
await click(p, ".gk-play");
await wait(p, () => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden || window.__audio.starts > 0, 15000);
if (await askShown(p)) await click(p, ".gk-ask-yes");
ok = await wait(p, () => window.__audio.starts > 0);
const n5 = await note(p);
r = await done(p);
check("medyasız: okuma doğal sesle sürer", ok, n5);
check("medyasız: yalnızca beklenen ihlal (media-src)", r.csp.every((x) => /^media-src blob/.test(x)) && !r.err.length, r.csp.concat(r.err).join(" | "));

// 6) Trusted Types zorunlu
p = await open("csp=tt");
await click(p, ".gk-play");
await wait(p, () => (window.__spoken || []).length > 0 || window.__audio.starts > 0 || !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, 10000);
if (await askShown(p)) await click(p, ".gk-ask-yes");
ok = await wait(p, () => window.__audio.starts > 0 || (window.__spoken || []).length > 0);
const tt = await p.evaluate(() => ({ natural: window.__audio.starts > 0, browser: (window.__spoken || []).length > 0 }));
const n6 = await note(p);
r = await done(p);
check("tt: okunur", ok, JSON.stringify(tt) + " " + n6);
check("tt: doğal sesle okunur", tt.natural, n6);
check("tt: ihlal ve hata yok", !r.csp.length && !r.err.length, r.csp.concat(r.err).join(" | "));

// 7) Trusted Types zorunlu, "gozkulak" politikasına izin yok: doğal ses kurulamaz, tarayıcı sesi okur
p = await open("csp=ttdar");
await click(p, ".gk-play");
ok = await wait(p, () => (window.__spoken || []).length > 0, 10000);
const n7 = await note(p);
r = await done(p);
check("ttdar: tarayıcının sesiyle okunur", ok, n7);
check("ttdar: sayfada hata yok", !r.err.length, r.err.join(" | ") + " | ihlaller: " + r.csp.join(", "));

console.log("HATA SAYISI:", errs.length, errs.join(" | "));
await b.close();

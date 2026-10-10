// İnceleme bulgularının sınamaları: karışık dil, yedek kaynak kapalı, güvenlik başlığı (CSP),
// duraklatılmışken yavaş cihaz geçişi, önbellekten eksilen dosya.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
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
async function open(query, { fresh = false } = {}) {
	if (fresh || !ctx) {
		if (ctx) await ctx.close();
		ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
		await ctx.addInitScript(FAKE);
		await ctx.addInitScript(AUDIO);
	}
	const p = await ctx.newPage();
	p.__req = [];
	p.on("request", (r) => { if (/gk-tts\/.*(onnx|wasm|mjs|json)$/.test(r.url())) p.__req.push(r.url().replace("http://127.0.0.1:8080/gk-tts/", "")); });
	p.on("pageerror", (e) => errs.push(query + ": " + e.message));
	p.on("console", (m) => {
		if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(query + " console: " + m.text());
		if (m.type() === "warning") p.__warn = (p.__warn || []).concat(m.text());
	});
	await p.goto(URL0 + "?" + query);
	await p.waitForFunction(() => window.GozKulak);
	await p.evaluate(() => GozKulak.open());
	return p;
}
const sh = (p, fn, arg) => p.evaluate(([f, a]) => new Function("root", "a", f)(document.querySelector("gozkulak-root").shadowRoot, a), [fn, arg]);
const status = (p) => sh(p, "return root.querySelector('.gk-tts-status').textContent + ' | ' + root.querySelector('.gk-tts-note').textContent;");
const label = (p) => sh(p, "return root.querySelector('.gk-play-label').textContent;");
const hl = (p) => p.evaluate(() => { const h = CSS.highlights.get("gk-read"); return h ? [...h][0].toString().slice(0, 40) : null; });
const clickPlay = (p) => sh(p, "root.querySelector('.gk-play').click(); return 1;");
const yes = (p) => sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
const stopBtn = (p) => sh(p, "root.querySelectorAll('.gk-ctl')[2].click(); return 1;");
const asking = (p) => sh(p, "return !root.querySelector('.gk-ask').hidden;");

// A) Türkçe sayfada lang="en" paragraf: İngilizce bölüm tarayıcının İngilizce sesiyle, sonra yine doğal ses
let p = await open("b=main&mix=1", { fresh: true });
await clickPlay(p);
await p.waitForTimeout(400);
await yes(p);
await p.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 30000 });
const en = await p.evaluate(() => window.__spoken.map((x) => x.lang + ": " + x.text.slice(0, 30)));
const atEn = await p.evaluate(() => window.__audio.starts);
console.log("A) İngilizce bölüm:", JSON.stringify(en), "| o ana kadar doğal ses parçası:", atEn > 0);
await p.waitForFunction((n) => window.__audio.starts > n, atEn, { timeout: 20000 });
console.log("A) sonra doğal ses sürdü:", true, "| vurgu:", await hl(p), "| not:", await status(p));
await stopBtn(p);
await p.close();

// B) Yedek kaynaklar kapalı + kendi sunucu yok → yedeklere hiç istek gitmez, tarayıcı sesi
p = await open("b=broken&fb=0", { fresh: true });
await clickPlay(p);
await p.waitForTimeout(400);
await yes(p);
await p.waitForTimeout(2500);
console.log("\nB) istenen dosyalar:", [...new Set(p.__req.map((u) => u.split("/")[0]))].join(", "), "| yedeğe istek:", p.__req.some((u) => u.startsWith("alt/")), "|", await label(p), "|", await status(p));
await stopBtn(p);
await p.close();

// C) Worker yanıtında katı CSP (blob: ve WebAssembly engelli) → indirmeden önce anlaşılır
p = await open("w=worker-csp.php&b=main", { fresh: true });
await clickPlay(p);
await p.waitForTimeout(2500);
console.log("\nC) onay soruldu mu:", await asking(p), "| inen:", p.__req.length, "|", await label(p), "|", await status(p), "| uyarı:", (p.__warn || []).join(" / ").slice(0, 140));
await stopBtn(p);
await p.close();

// D) Duraklatılmışken yavaş cihaz tespiti → tarayıcı sesine geçer ama duraklatılmış kalır
p = await open("w=worker-slow2.js&b=main", { fresh: true });
await clickPlay(p);
await p.waitForTimeout(400);
await yes(p);
await p.waitForFunction(() => window.__audio.starts > 0, null, { timeout: 20000 });
await p.waitForTimeout(300);
await clickPlay(p); // duraklat
const spokenBefore = await p.evaluate(() => window.__spoken.length);
console.log("\nD) duraklatıldı:", await label(p));
await p.waitForFunction(() => [...document.querySelector("gozkulak-root").shadowRoot.querySelectorAll(".gk-tile")].some((t) => t.textContent.includes("Doğal ses") && t.getAttribute("aria-pressed") === "false"), null, { timeout: 45000 }).catch(() => {});
await p.waitForTimeout(600);
console.log("D) geçişten sonra:", await label(p), "|", await status(p), "| konuştu mu:", (await p.evaluate(() => window.__spoken.length)) > spokenBefore);
await clickPlay(p); // devam
await p.waitForTimeout(400);
console.log("D) devam:", await label(p), "| tarayıcı sesi konuştu:", (await p.evaluate(() => window.__spoken.length)) > spokenBefore);
await stopBtn(p);
await p.close();

// E) Önbellekten bir dosya silinmiş → yeniden onay sorulur (sessiz indirme yok)
p = await open("b=main", { fresh: true });
await clickPlay(p);
await p.waitForTimeout(400);
await yes(p);
await p.waitForFunction(() => window.__audio.starts > 0, null, { timeout: 20000 });
await stopBtn(p);
const removed = await p.evaluate(async () => {
	const c = await caches.open("gozkulak-tts-v1");
	const keys = await c.keys();
	const k = keys.find((r) => r.url.endsWith("ort-wasm-simd-threaded.wasm"));
	return k ? await c.delete(k) : false;
});
await p.close();
p = await open("b=main");
await clickPlay(p);
await p.waitForTimeout(800);
console.log("\nE) silindi:", removed, "| onay soruldu:", await asking(p), "| inen:", p.__req.length);
await yes(p);
await p.waitForFunction(() => window.__audio.starts > 0, null, { timeout: 20000 });
console.log("E) onaydan sonra inen:", p.__req.map((u) => u.split("/").pop()).join(", "));
await stopBtn(p);
await p.close();

// F) Bitince ses bağlamı askıya alınır, motor 5 dk sonra bırakılır (burada yalnızca durum)
console.log("\nHATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

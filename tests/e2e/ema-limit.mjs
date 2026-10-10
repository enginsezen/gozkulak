// Motor dosyası beklenenden büyük gelirse indirme boyut sınırında kesilir (bellek dolmasın) ve dosya
// kullanılmaz; yedek kaynak açıksa okuma oradan sürer. Gerçek ONNX Runtime + sahte modeller, gerçek Worker.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const FAKE = readFileSync(__T + "/e2e/fake-speech.js", "utf8");
const AUDIO = `(() => {
	window.__audio = { starts: 0 };
	const o = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...a) {
		if (this.buffer && this.buffer.length > 1) __audio.starts++;
		return o.apply(this, a);
	};
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
	await ctx.addInitScript(AUDIO);
	const p = await ctx.newPage();
	p.__req = [];
	p.on("request", (r) => { if (/gk-tts\/.*(onnx|wasm|mjs|json)$/.test(r.url())) p.__req.push(r.url().replace("http://127.0.0.1:8080/gk-tts/", "")); });
	await p.goto(URL0 + "?" + query);
	await p.waitForFunction(() => window.GozKulak);
	await p.evaluate(() => GozKulak.open());
	return p;
}
const sh = (p, fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
const note = (p) => sh(p, "return root.querySelector('.gk-tts-note').textContent;");
const listen = async (p) => {
	await sh(p, "root.querySelector('.gk-play').click(); return 1;");
	await p.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, null, { timeout: 10000 });
	await sh(p, "root.querySelector('.gk-ask-yes').click(); return 1;");
};

// Yedek kaynak kapalı: büyük dosya reddedilir, okuma tarayıcının sesine düşer
for (const [b0, how] of [["big", "Content-Length ile"], ["bigc", "parça parça"]]) {
	const p = await open("b=" + b0 + "&fb=0");
	await listen(p);
	await p.waitForFunction(() => /Tanı/.test(document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-tts-note").textContent), null, { timeout: 30000 }).catch(() => {});
	const n = await note(p);
	check("büyük dosya reddedilir (" + how + ")", /text\.onnx alınamadı/.test(n) && /beklenenden büyük/.test(n), n.slice(0, 200));
	await p.waitForFunction(() => window.__spoken && window.__spoken.length > 0, null, { timeout: 10000 }).catch(() => {});
	check("okuma tarayıcının sesiyle sürer (" + how + ")", (await p.evaluate(() => (window.__spoken || []).length)) > 0);
	await p.context().close();
}

// Yedek kaynak açık: büyük dosya atlanır, yedekten alınır ve doğal sesle okunur
const p = await open("b=big");
await listen(p);
await p.waitForFunction(() => window.__audio.starts > 0, null, { timeout: 30000 }).catch(() => {});
check("yedek kaynaktan doğal sesle okunur", (await p.evaluate(() => window.__audio.starts)) > 0, await note(p));
check("text.onnx yedek kaynaktan istendi", p.__req.some((u) => /^alt\/.*text\.onnx$/.test(u)), p.__req.filter((u) => /text\.onnx/.test(u)).join(", "));
await p.context().close();

console.log("HATA SAYISI:", errs.length, errs.join(" | "));
await b.close();

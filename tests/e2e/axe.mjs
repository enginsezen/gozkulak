// Erişilebilirlik taraması (axe-core): GözKulak'ın kendi arayüzü bütün durumlarında WCAG 2.2 A/AA
// kurallarına göre ihlalsiz olmalı. Yalnızca eklentinin öğeleri taranır (gozkulak-root, gozkulak-overlay);
// sitenin kendi eksikleri bu testin konusu değil.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const FAKE = readFileSync(__T + "/e2e/fake-speech.js", "utf8");
const AXE = readFileSync(__T + "/node_modules/axe-core/axe.min.js", "utf8");
const URL0 = "http://127.0.0.1:8080/gk-tts/page.php?b=main";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errs = [];
const check = (name, ok, info) => {
	console.log((ok ? "✓ " : "✗ ") + name + (info ? " — " + info : ""));
	if (!ok) errs.push(name);
};

async function open({ width = 1280, height = 900, mobile = false, lang = "tr", prefs = null } = {}) {
	const ctx = await b.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
	await ctx.addInitScript(FAKE);
	if (prefs) await ctx.addInitScript((v) => localStorage.setItem("gozkulak:v1", v), JSON.stringify(prefs));
	const p = await ctx.newPage();
	p.__err = [];
	p.on("pageerror", (e) => p.__err.push(e.message));
	if (lang !== "tr") {
		await p.route("**/gk-tts/page.php*", async (r) => {
			const res = await r.fetch();
			await r.fulfill({ response: res, body: (await res.text()).replace('<html lang="tr">', `<html lang="${lang}">`) });
		});
	}
	await p.goto(URL0);
	await p.waitForFunction(() => window.GozKulak);
	await p.addScriptTag({ content: AXE });
	return p;
}
const click = (p, sel) => p.evaluate((s) => document.querySelector("gozkulak-root").shadowRoot.querySelector(s).click(), sel);
async function scan(p, name) {
	await p.waitForTimeout(250);
	const v = await p.evaluate(async (tags) => {
		const include = [["gozkulak-root"]];
		if (document.querySelector("gozkulak-overlay")) include.push(["gozkulak-overlay"]);
		const r = await window.axe.run({ include }, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
		return r.violations.map((x) => x.id + " (" + x.impact + ", " + x.nodes.length + "): " + x.nodes.slice(0, 2).map((n) => n.target.join(" > ")).join(" | "));
	}, TAGS);
	check(name, !v.length && !p.__err.length, v.concat(p.__err).join(" ; "));
}

let p = await open();
await scan(p, "menü kapalı");
await p.evaluate(() => GozKulak.open());
await scan(p, "menü açık");
// İndirme onayı
await click(p, ".gk-play");
await p.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, null, { timeout: 10000 });
await scan(p, "doğal ses onay kutusu");
// Tarayıcının sesiyle okuma, panel kapalı: mini oynatıcı
await click(p, ".gk-ask-no");
await p.waitForFunction(() => (window.__spoken || []).length > 0, null, { timeout: 10000 });
await scan(p, "okuma sürerken (panel açık)");
await p.evaluate(() => GozKulak.close());
await scan(p, "okuma sürerken (mini oynatıcı)");
await p.context().close();

// Okuma maskesi ve cetvel (sayfanın üstüne çizilen katman)
for (const mode of ["readingMask", "readingGuide"]) {
	p = await open({ prefs: { [mode]: true } });
	await p.evaluate(() => GozKulak.open());
	await scan(p, mode === "readingMask" ? "okuma maskesi açık" : "okuma cetveli açık");
	await p.context().close();
}

// Koyu mod, yüksek kontrast, büyük yazı
for (const [name, prefs] of [["koyu mod", { darkMode: true }], ["yüksek kontrast", { contrast: true }], ["en büyük yazı ve geniş aralıklar", { fontSize: 4, lineHeight: 2, letterSpacing: 2 }]]) {
	p = await open({ prefs });
	await p.evaluate(() => GozKulak.open());
	await scan(p, name);
	await p.context().close();
}

// İngilizce sayfa
p = await open({ lang: "en" });
await p.evaluate(() => GozKulak.open());
await scan(p, "İngilizce sayfa, menü açık");
await p.context().close();

// Telefon
p = await open({ width: 390, height: 844, mobile: true });
await scan(p, "telefon, menü kapalı");
await p.evaluate(() => GozKulak.open());
await scan(p, "telefon, menü açık");
await p.context().close();

console.log("HATA SAYISI:", errs.length, errs.join(" | "));
await b.close();

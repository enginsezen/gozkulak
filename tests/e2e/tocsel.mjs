import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const b = await chromium.launch();
const c = await b.newContext();
await c.addInitScript(readFileSync(new globalThis.URL("./fake-speech.js", import.meta.url), "utf8"));
const p = await c.newPage();
await p.goto("http://127.0.0.1:8080/gk-oku/hours.html");
await p.waitForFunction(() => window.GozKulak);
await p.evaluate(() => GozKulak.open());
await p.evaluate(() => {
	const range = document.createRange();
	range.selectNodeContents(document.querySelector(".lwptoc_items"));
	const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
	document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-play").click();
});
await p.waitForTimeout(1500);
console.log("seçim okundu:", JSON.stringify(await p.evaluate(() => window.__spoken.map((x) => x.text))));
console.log("sayfada TOC cümlesi:", await p.evaluate(() => GozKulak.sentences().some((s) => /Safranbolu’nun Kalbinde/.test(s.text))));
await b.close();

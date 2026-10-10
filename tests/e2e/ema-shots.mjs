import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const b = await chromium.launch();
for (const [name, vp, mobile] of [["desk", { width: 1280, height: 900 }, false], ["mob", { width: 375, height: 740 }, true]]) {
	const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
	await ctx.addInitScript(FAKE);
	const p = await ctx.newPage();
	await p.route("**/sound.onnx", async (r) => { await new Promise((x) => setTimeout(x, 1500)); r.continue(); });
	await p.goto("http://127.0.0.1:8080/gk-tts/page.php?b=main");
	await p.waitForFunction(() => window.GozKulak);
	const sh = (fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
	await p.evaluate(() => GozKulak.open());
	await p.waitForTimeout(300);
	await p.screenshot({ path: `${S}/shots/${name}-1-panel.png` });
	await sh("root.querySelector('.gk-play').click();");
	await p.waitForTimeout(700);
	await p.screenshot({ path: `${S}/shots/${name}-2-onay.png` });
	await sh("root.querySelector('.gk-ask-yes').click();");
	await p.waitForTimeout(500);
	await p.screenshot({ path: `${S}/shots/${name}-3-indir.png` });
	await p.waitForTimeout(2500);
	await p.screenshot({ path: `${S}/shots/${name}-4-okuyor.png` });
	await p.keyboard.press("Escape");
	await p.waitForTimeout(300);
	await p.screenshot({ path: `${S}/shots/${name}-5-mini.png` });
	await ctx.close();
}
await b.close();

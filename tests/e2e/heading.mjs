import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
for (const prefs of [{ lineHeight: 1 }, { lineHeight: 2 }, { lineHeight: 1, fontSize: 2 }, { contrast: true }]) {
	await p.goto("http://127.0.0.1:8080/gk-mock/");
	await p.evaluate((v) => localStorage.setItem("gozkulak:v1", JSON.stringify(v)), prefs);
	await p.reload();
	await p.waitForTimeout(800);
	console.log(JSON.stringify(prefs), await p.evaluate(() => {
		const g = (s) => { const c = getComputedStyle(document.querySelector(s)); return c.fontSize + "/" + c.lineHeight; };
		return "h2 " + g("#tbtitle") + " | p " + g("#para") + " | stroke " + getComputedStyle(document.querySelector("#sicon svg")).stroke + " | svg zemin " + getComputedStyle(document.querySelector("#eicon svg")).backgroundColor;
	}));
}
await b.close();

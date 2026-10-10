import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const errs = [];
const ready = (p) => p.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
const panelBox = (p) => p.evaluate(() => {
	const sh = document.querySelector("gozkulak-root").shadowRoot;
	const r = sh.querySelector(".gk-panel").getBoundingClientRect();
	const t = sh.querySelector(".gk-title").getBoundingClientRect();
	const c = sh.querySelector(".gk-close").getBoundingClientRect();
	return { panel: [r.left, r.top, r.right, r.bottom].map(Math.round), title: Math.round(t.top), close: [Math.round(c.left), Math.round(c.top)], vp: [innerWidth, innerHeight] };
});
for (const [name, url, vp] of [["oy150-360", "menu-oy.html", { width: 360, height: 740 }], ["mid-360", "menu-mid.html", { width: 360, height: 740 }], ["oy150-desktop", "menu-oy.html", { width: 1280, height: 700 }], ["mid-desktop", "menu-mid.html", { width: 1280, height: 700 }]]) {
	const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500, deviceScaleFactor: vp.width < 500 ? 3 : 1 });
	const p = await ctx.newPage();
	p.on("pageerror", (e) => errs.push(e.message));
	await p.goto("http://127.0.0.1:8080/gk-tara/" + url);
	await ready(p);
	await p.evaluate(() => window.GozKulak.open());
	await p.waitForTimeout(150);
	const m = await panelBox(p);
	const fits = m.panel[0] >= 0 && m.panel[1] >= 0 && m.panel[2] <= m.vp[0] && m.panel[3] <= m.vp[1] && m.title >= 0;
	console.log(name, JSON.stringify(m), fits ? "sığıyor, başlık görünür" : "TAŞIYOR");
	await p.screenshot({ path: `${SHOTS}/mob-${name}.png` });
	await ctx.close();
}

// Okuma cetveli: dokunmatik
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-tara/menu.html");
await p.evaluate(() => localStorage.setItem("gozkulak:v1", JSON.stringify({ readingGuide: true })));
await p.reload();
await ready(p);
await p.waitForTimeout(300);
const guide = () => p.evaluate(() => { const o = document.querySelector("gozkulak-overlay").shadowRoot; const g = o.querySelector(".gk-grip"); return { line: Math.round(o.querySelector(".gk-guide").getBoundingClientRect().top), grip: g.hidden ? "gizli" : Math.round(g.getBoundingClientRect().top), url: location.pathname }; });
console.log("başlangıç:", JSON.stringify(await guide()));
// Sayfaya dokunmak cetveli oynatmamalı
await p.touchscreen.tap(100, 600);
await p.waitForTimeout(200);
console.log("sayfaya dokununca:", JSON.stringify(await guide()));
// Tutamacı sürükle (CDP dokunma olaylarıyla)
const cdp = await ctx.newCDPSession(p);
const g0 = await p.evaluate(() => { const r = document.querySelector("gozkulak-overlay").shadowRoot.querySelector(".gk-grip").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: g0[0], y: g0[1] }] });
for (let i = 1; i <= 10; i++) {
	await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: g0[0], y: g0[1] + i * 25 }] });
	await p.waitForTimeout(16);
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await p.waitForTimeout(200);
console.log("tutamaç 250 px aşağı sürüklenince:", JSON.stringify(await guide()), "| sayfa kaydı mı:", await p.evaluate(() => scrollY));
// Sayfayı parmakla kaydır: cetvel ekranda yerinde kalmalı
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 150, y: 600 }] });
for (let i = 1; i <= 10; i++) {
	await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 150, y: 600 - i * 30 }] });
	await p.waitForTimeout(16);
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await p.waitForTimeout(400);
console.log("sayfa kaydırılınca:", JSON.stringify(await guide()), "| kaydırma:", await p.evaluate(() => Math.round(scrollY)));
await p.screenshot({ path: `${SHOTS}/mob-guide.png` });
await ctx.close();

// Masaüstü: fare izlenir, tutamaç gizli
const d = await (await b.newContext({ viewport: { width: 1280, height: 700 } })).newPage();
await d.goto("http://127.0.0.1:8080/gk-tara/menu.html");
await d.evaluate(() => localStorage.setItem("gozkulak:v1", JSON.stringify({ readingMask: true })));
await d.reload();
await ready(d);
await d.mouse.move(400, 500);
await d.waitForTimeout(100);
console.log("masaüstü fare:", await d.evaluate(() => { const o = document.querySelector("gozkulak-overlay").shadowRoot; return "maske üst " + Math.round(o.querySelector(".gk-mask-top").getBoundingClientRect().height) + " | tutamaç " + (o.querySelector(".gk-grip").hidden ? "gizli" : "görünür"); }));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

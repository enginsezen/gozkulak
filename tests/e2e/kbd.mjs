import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü

const S = __T;
const AXE = readFileSync(S + "/node_modules/axe-core/axe.min.js", "utf8");
const URL = process.argv[2] || "http://127.0.0.1:8080/gk-tara/b.html";
const SHOTS = process.argv[3] || S + "/shots";

const b = await chromium.launch();
const errs = [];

async function page(viewport, extra = {}) {
	const ctx = await b.newContext({ viewport, ...extra });
	const p = await ctx.newPage();
	p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
	return p;
}

// Odaktaki öğeyi gölge DOM içinden de okuyarak tarif eder.
const focused = (p) => p.evaluate(() => {
	let a = document.activeElement;
	while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
	if (!a || a === document.body) return "body";
	const name = a.getAttribute("aria-label") || a.textContent.trim().replace(/\s+/g, " ").slice(0, 30);
	return a.tagName.toLowerCase() + (a.className && typeof a.className === "string" ? "." + a.className.split(" ")[0] : "") + " «" + name + "»";
});
const panelOpen = (p) => p.evaluate(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector("#gk-panel").hidden);

// --- klavye akışı ---
const p = await page({ width: 1280, height: 800 });
await p.goto(URL);
await p.evaluate(() => localStorage.removeItem("gozkulak:v1"));
await p.reload();
await p.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
const order = [];
await p.keyboard.press("Tab");
order.push(await focused(p));
await p.keyboard.press("Tab");
order.push(await focused(p));
console.log("sayfa başından ilk iki sekme:", order.join("  →  "));

// Menü düğmesine odaklan ve Enter
await p.evaluate(() => document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-btn").focus());
await p.keyboard.press("Enter");
console.log("Enter sonrası açık:", await panelOpen(p), "| odak:", await focused(p));
const inPanel = [];
for (let i = 0; i < 22; i++) {
	await p.keyboard.press("Tab");
	inPanel.push(await focused(p));
	if (!(await panelOpen(p))) break;
}
console.log("panel içinde sekme sırası:\n  " + inPanel.join("\n  "));
console.log("sekme panelden çıkınca panel açık mı:", await panelOpen(p));
// Yeniden aç, bir kutuyu Space ile değiştir, Esc ile kapat
await p.keyboard.press("Alt+Shift+KeyG");
console.log("kısayol:", await panelOpen(p), "| odak:", await focused(p));
await p.keyboard.press("Tab");
await p.keyboard.press("Tab");
await p.keyboard.press("Tab");
await p.keyboard.press("Tab");
const before = await focused(p);
await p.keyboard.press("Space");
const pressed = await p.evaluate(() => { const r = document.querySelector("gozkulak-root").shadowRoot; return r.activeElement ? r.activeElement.getAttribute("aria-pressed") : "odak yok"; });
console.log("Space ile:", before, "aria-pressed =", pressed, "| sınıflar:", await p.evaluate(() => document.documentElement.className));
await p.screenshot({ path: SHOTS + "/kbd-focus.png" });
await p.keyboard.press("Escape");
console.log("Esc:", await panelOpen(p), "| odak:", await focused(p));

// --- axe: kapalı ve açık menü ---
await p.evaluate(() => localStorage.removeItem("gozkulak:v1"));
await p.reload();
await p.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
await p.addScriptTag({ content: AXE });
const runAxe = () => p.evaluate(async () => {
	const res = await window.axe.run({ include: [["gozkulak-root"]] }, { resultTypes: ["violations"] });
	return res.violations.map((v) => v.id + " (" + v.impact + "): " + v.nodes.length + " → " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ") + " :: " + v.help);
});
console.log("axe, menü kapalı:", JSON.stringify(await runAxe(), null, 1));
await p.evaluate(() => window.GozKulak.open());
await p.waitForTimeout(200);
console.log("axe, menü açık:", JSON.stringify(await runAxe(), null, 1));

// --- küçük ekran ve %200 yakınlaştırma ---
for (const [label, vp, opts] of [["320x568", { width: 320, height: 568 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ["%200 (640x400)", { width: 640, height: 400 }, {}]]) {
	const q = await page(vp, opts);
	await q.goto(URL);
	await q.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
	await q.evaluate(() => window.GozKulak.open());
	await q.waitForTimeout(200);
	const m = await q.evaluate(() => {
		const sh = document.querySelector("gozkulak-root").shadowRoot;
		const r = sh.querySelector(".gk-panel").getBoundingClientRect();
		const body = sh.querySelector(".gk-body");
		return { panel: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], viewport: [innerWidth, innerHeight], scrollable: body.scrollHeight > body.clientHeight, minTile: Math.min(...[...sh.querySelectorAll("button")].filter((x) => x.offsetParent).map((x) => Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))) };
	});
	console.log(label, JSON.stringify(m), m.panel[0] >= 0 && m.panel[1] >= 0 && m.panel[2] <= m.viewport[0] && m.panel[3] <= m.viewport[1] ? "ekrana sığıyor" : "TAŞIYOR");
	await q.screenshot({ path: SHOTS + "/kbd-" + vp.width + ".png" });
	await q.context().close();
}

console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

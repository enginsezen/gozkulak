import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü

const URL = "http://127.0.0.1:8080/gk-mock/";
const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

const probes = {};

async function run(name, prefs) {
	await p.goto(URL);
	await p.evaluate((v) => { if (v) localStorage.setItem("gozkulak:v1", JSON.stringify(v)); else localStorage.removeItem("gozkulak:v1"); }, prefs);
	await p.reload();
	await p.waitForTimeout(2200);
	const m = await p.evaluate(() => {
		const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), top: Math.round(b.top * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
		const cs = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
		return {
			html: document.documentElement.className,
			icons: [...document.querySelectorAll("#header-container nav i")].map((i) => Math.round(i.getBoundingClientRect().top * 10) / 10),
			logo: r("#Top_bar .logo p"),
			para: { fs: cs("#para", "fontSize"), lh: cs("#para", "lineHeight"), h: r("#para").h },
			heroLayer: { overlay: document.querySelector(".hero .overlay").className, inner: document.querySelector(".hero .inner").className, hero: document.querySelector(".hero").className },
			marks: {
				bgimg: [...document.querySelectorAll(".gk-bgimg")].map((e) => e.id || e.tagName.toLowerCase() + "." + e.className.split(" ")[0]),
				c1: [...document.querySelectorAll(".gk-c1")].map((e) => e.tagName.toLowerCase() + "." + e.className.split(" ")[0]),
			},
			filters: {
				hero: cs(".hero", "filter"), rs: cs("rs-sbg", "filter"), ele: cs("#ele", "filter"), cardMedia: cs("#card1 .media", "filter"), cardImg: cs("#card1 img", "filter"), wrapper: cs("#Wrapper", "filter"),
			},
			vis: { rs: cs("rs-sbg", "visibility"), rsBg: cs("rs-sbg", "backgroundImage").slice(0, 20), heroBg: cs(".hero", "backgroundImage").slice(0, 20), img: cs("#card1 img", "visibility") },
			points: { hero: r(".hero"), heroTop: (() => { const b = document.querySelector(".hero").getBoundingClientRect(); return { x: Math.round(b.x + b.width * 0.75), y: Math.round(b.y + 40) }; })(), rev: (() => { const b = document.querySelector("rs-module-wrap").getBoundingClientRect(); return { x: Math.round(b.x + b.width * 0.5), y: Math.round(b.y + b.height * 0.5) }; })(), ele: (() => { const b = document.querySelector("#ele").getBoundingClientRect(); return { x: Math.round(b.x + b.width * 0.5), y: Math.round(b.y + b.height * 0.5) }; })(), cardImg: r("#card1 img"), card2: r(".card:nth-child(2) img"), para: r("#para"), wrapper: (() => { const b = document.querySelector(".cards").getBoundingClientRect(); return { x: Math.round(b.right - 20), y: Math.round(b.y + 20) }; })() },
		};
	});
	probes[name] = m;
	await p.screenshot({ path: `${SHOTS}/mock-${name}.png`, fullPage: false });
	console.log(`\n== ${name}`);
	console.log(" html:", m.html);
	console.log(" ikon üstleri:", m.icons.join(", "), "| logo:", JSON.stringify(m.logo));
	console.log(" paragraf:", JSON.stringify(m.para));
	console.log(" manşet sınıfları:", JSON.stringify(m.heroLayer));
	console.log(" işaretler:", JSON.stringify(m.marks));
	console.log(" filtreler:", JSON.stringify(m.filters));
	console.log(" görünürlük:", JSON.stringify(m.vis));
}

await run("base", null);
await run("lh1", { lineHeight: 1 });
await run("lh2-font4", { lineHeight: 2, fontSize: 4 });
await run("font4", { fontSize: 4 });
await run("contrast", { contrast: true });
await run("dark", { darkMode: true });
await run("noimg", { hideImages: true });
await run("dark-gray", { darkMode: true, grayscale: true });

writeFileSync(`${SHOTS}/mock-probes.json`, JSON.stringify(probes, null, 1));
console.log("\nHATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

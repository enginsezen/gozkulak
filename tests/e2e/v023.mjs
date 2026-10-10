import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü

const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

async function open(prefs, wait = 2600) {
	await p.goto("http://127.0.0.1:8080/gk-mock/");
	await p.evaluate((v) => { if (v) localStorage.setItem("gozkulak:v1", JSON.stringify(v)); else localStorage.removeItem("gozkulak:v1"); }, prefs);
	await p.reload();
	await p.waitForTimeout(wait);
}

const probe = () => p.evaluate(() => {
	const q = (s) => document.querySelector(s);
	const cs = (s, pseudo) => getComputedStyle(q(s), pseudo || null);
	const paintCls = (s) => [...q(s).classList].filter((c) => c.startsWith("gk-")).join(" ");
	return {
		html: document.documentElement.className,
		bodyBg: cs("body").backgroundColor,
		htmlBg: cs("html").backgroundColor,
		paraColor: cs("#para").color,
		cardBg: cs("#card1").backgroundColor,
		cardText: cs("#card1 p").color,
		heroText: cs(".hero h1").color,
		heroFilter: cs(".hero").filter,
		imgFilter: cs("#card1 img").filter,
		titlebar: cs("#titlebar").backgroundImage.slice(0, 80),
		tbTitle: cs("#tbtitle").color,
		lheroBefore: cs("#lhero", "::before").backgroundImage.slice(0, 60),
		lheroText: cs("#lhero h2").color,
		econBefore: cs("#econ", "::before").backgroundColor + " / " + cs("#econ", "::before").opacity,
		econText: cs("#econ h3").color,
		iconFill: cs("#eicon svg").fill,
		whyBox: cs("#whybox").backgroundColor,
		whyText: cs("#whytext").color,
		logoFilter: cs("#logo1").filter,
		hovColor: cs("#hov").color,
		overlay: paintCls(".hero .overlay") + " | " + cs(".hero .overlay").backgroundColor,
		lazybg: paintCls("#lazybg") + " | " + cs("#lazybg").backgroundImage.slice(0, 20),
		wrapperBg: cs("#Wrapper").backgroundImage.slice(0, 20),
		navLink: cs("#header-container nav a").color,
		classesOnPage: document.querySelectorAll("[class*='gk-p']").length,
	};
});

const shotAt = async (name, sel) => {
	await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "start" }), sel);
	await p.waitForTimeout(150);
	await p.screenshot({ path: `${SHOTS}/${name}.png` });
};

const pixel = (name, sel, fx, fy) => p.evaluate(([s, x, y]) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.x + r.width * x), Math.round(r.y + r.height * y)]; }, [sel, fx, fy]);

const out = {};
for (const [name, prefs] of [["base", null], ["dark", { darkMode: true }], ["contrast", { contrast: true }]]) {
	await open(prefs);
	out[name] = await probe();
	await shotAt(`v3-${name}-top`, "#Wrapper");
	out[name].ptHero = await pixel(name, ".hero", 0.75, 0.15);
	out[name].ptCard = await pixel(name, "#card1 img", 0.5, 0.5);
	await shotAt(`v3-${name}-mid`, "#titlebar");
	await shotAt(`v3-${name}-why`, "#why");
	out[name].ptWhy = await pixel(name, "#why", 0.2, 0.5);
}

// Koyu mod: üzerine gelme
await open({ darkMode: true });
await p.evaluate(() => document.querySelector("#logos").scrollIntoView());
await p.hover("#hov");
await p.waitForTimeout(800);
out.hoverDark = await p.evaluate(() => getComputedStyle(document.querySelector("#hov")).color);
await p.hover("#logo1");
await p.waitForTimeout(800);
out.logoHoverDark = await p.evaluate(() => getComputedStyle(document.querySelector("#logo1")).filter);
await p.mouse.move(5, 5);
await p.waitForTimeout(800);
out.hoverOff = await p.evaluate(() => getComputedStyle(document.querySelector("#hov")).color);

// Kontrast → koyu → kapalı geçişleri
await open({ contrast: true });
const sh = (fn, arg) => p.evaluate(([f, a]) => { const host = document.querySelector("gozkulak-root"); return new Function("host", "root", "a", f)(host, host.shadowRoot, a); }, [fn, arg]);
const clickTile = (label) => sh(`const t = [...root.querySelectorAll('.gk-tile')].find(t => t.querySelector('.gk-tile-label').textContent === a); t.click(); return true;`, label);
const count = () => p.evaluate(() => document.querySelectorAll("[class*='gk-p'], .gk-c0, .gk-cimg").length);
await sh(`root.querySelector('.gk-btn').click(); return 1;`);
out.countContrast = await count();
await clickTile("Koyu mod");
await p.waitForTimeout(400);
out.countDark = await count();
out.htmlAfterSwitch = await p.evaluate(() => document.documentElement.className);
await clickTile("Koyu mod");
await p.waitForTimeout(400);
out.countOff = await count();
out.measureLeft = await p.evaluate(() => document.documentElement.classList.contains("gk-measure"));

console.log(JSON.stringify(out, null, 1));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

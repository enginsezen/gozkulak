import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
async function state(prefs) {
	await p.goto("http://127.0.0.1:8080/gk-mock/");
	await p.evaluate((v) => { if (v) localStorage.setItem("gozkulak:v1", JSON.stringify(v)); else localStorage.removeItem("gozkulak:v1"); }, prefs);
	await p.reload();
	await p.waitForTimeout(2000);
	return p.evaluate(() => {
		const q = (s) => document.querySelector(s);
		const cs = (s, pseudo) => getComputedStyle(q(s), pseudo || null);
		const pt = (s, fx, fy) => { const r = q(s).getBoundingClientRect(); return { x: Math.round(r.x + r.width * fx), y: Math.round(r.y + r.height * fy) }; };
		return {
			cls: { titlebar: q("#titlebar").className, container: q("#titlebar .container").className, lhero: q("#lhero").className, econ: q("#econ").className, hero: q(".hero").className, rs: q("rs-sbg").className, wrapper: q("#Wrapper").className },
			titlebar: [cs("#titlebar").backgroundImage, cs("#titlebar").backgroundColor].join(" | "),
			lheroBefore: [cs("#lhero", "::before").backgroundImage.slice(0, 30), cs("#lhero", "::before").backgroundColor].join(" | "),
			lheroBg: cs("#lhero").backgroundImage.slice(0, 25),
			econBefore: [cs("#econ", "::before").backgroundColor, cs("#econ", "::before").opacity].join(" | "),
			iconFill: cs("#eicon svg").fill, strokeFill: cs("#sicon svg").fill,
			wrapperBg: cs("#Wrapper").backgroundImage.slice(0, 20),
			pts: { tb: pt("#titlebar", 0.05, 0.5), lhero: pt("#lhero", 0.1, 0.2), econ: pt("#econ", 0.8, 0.5), hero: pt(".hero", 0.75, 0.15) },
			scrollY: 0,
		};
	});
}
const base = await state(null);
await p.evaluate(() => document.querySelector("#titlebar").scrollIntoView());
await p.screenshot({ path: SHOTS + "/c2-base.png" });
const con = await state({ contrast: true });
console.log(JSON.stringify(con, null, 1));
for (const [name, sel] of [["c2-contrast-top", null], ["c2-contrast", "#titlebar"]]) {
	if (sel) await p.evaluate((s) => document.querySelector(s).scrollIntoView(), sel);
	await p.screenshot({ path: `${SHOTS}/${name}.png` });
}
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

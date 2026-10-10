import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:8080/gk-mock/listeo.html");
await p.evaluate(() => localStorage.setItem("gozkulak:v1", JSON.stringify({ darkMode: true })));
await p.reload();
await p.waitForTimeout(1200);
const read = () => p.evaluate(() => {
	const c = (s) => { const e = document.querySelector(s); const x = getComputedStyle(e); return x.backgroundColor + "/" + x.color; };
	return ["body " + c("body"), "wrapper " + c("#wrapper"), "titlebar " + c("#titlebar"), "b5 " + c("#b5"), "b5p " + c("#b5 p"), "li " + c("#b5 li"), "b30 " + c("#b30"), "nav " + c("#lnav")].join(" | ");
});
console.log("başta  :", await read());
for (let i = 0; i < 12; i++) {
	await p.mouse.wheel(0, 500);
	await p.waitForTimeout(250);
	await p.mouse.move(300 + i * 20, 400);
	await p.waitForTimeout(150);
}
await p.waitForTimeout(1500);
console.log("kaydır.:", await read());
await p.screenshot({ path: SHOTS + "/listeo-dark.png" });
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

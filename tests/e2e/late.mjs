import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") errs.push(m.type() + ": " + m.text()); });
for (const prefs of [{ darkMode: true }, { contrast: true }]) {
	await p.goto("http://127.0.0.1:8080/gk-mock/");
	await p.evaluate((v) => localStorage.setItem("gozkulak:v1", JSON.stringify(v)), prefs);
	await p.reload();
	const read = () => p.evaluate(() => { const c = (s) => { const x = getComputedStyle(document.querySelector(s)); return x.backgroundColor + " / " + x.color; }; return "kutu " + c("#latebox") + " | başlık " + c("#latetitle") + " | hap " + c("#latepill") + " | enjekte " + c("#injected"); });
	await p.waitForTimeout(1000);
	console.log(JSON.stringify(prefs), "önce:", await read());
	await p.waitForTimeout(3500);
	console.log(JSON.stringify(prefs), "sonra:", await read());
}
console.log("script:", await p.evaluate(() => window.GozKulak.script + " / " + window.GozKulak.version));
console.log("HATALAR/UYARILAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

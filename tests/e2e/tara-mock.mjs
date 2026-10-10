import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("http://127.0.0.1:8080/gk-tara/b.html");
await p.evaluate(() => { localStorage.setItem("gozkulak:v1", JSON.stringify({ darkMode: true })); window.GK_TARAMA_SAYFALAR = ["/gk-mock/"]; });
const t0 = Date.now();
await p.evaluate(readFileSync(__R + "/tools/tarama/erisilebilirlik-tarama.js", "utf8"));
await p.waitForSelector("#gk-tarama-panel", { timeout: 120000 });
console.log("süre:", Math.round((Date.now() - t0) / 1000), "sn");
console.log(await p.inputValue("#gk-tarama-panel textarea"));
await p.click("#gk-tarama-panel button");
console.log("panoya:", (await p.evaluate(() => navigator.clipboard.readText())).length, "karakter");
console.log("tercih geri geldi mi:", await p.evaluate(() => localStorage.getItem("gozkulak:v1")));
console.log("kalan iframe:", await p.evaluate(() => document.querySelectorAll("iframe").length));
await p.screenshot({ path: (process.argv[2] || __T + "/shots") + "/tara-panel.png" });
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

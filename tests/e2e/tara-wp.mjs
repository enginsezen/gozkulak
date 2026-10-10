import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("http://localhost:8080/wp-login.php");
await p.fill("#user_login", "admin");
await p.fill("#user_pass", "admin");
await p.click("#wp-submit");
await p.waitForLoadState("networkidle");
await p.goto("http://localhost:8080/?p=6");
await p.evaluate(() => { window.GK_TARAMA_SAYFALAR = ["/", "/?p=6", "/?page_id=2"]; });
await p.evaluate(readFileSync(__R + "/tools/tarama/erisilebilirlik-tarama.js", "utf8"));
await p.waitForSelector("#gk-tarama-panel", { timeout: 120000 });
const text = await p.inputValue("#gk-tarama-panel textarea");
console.log(text);
console.log("admin bar / gozkulak sızdı mı:", /wpadminbar|gozkulak-root|gk-btn/.test(text));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

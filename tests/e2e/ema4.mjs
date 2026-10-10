// Takılan motor: ses gelmeyince 20 sn sonra tarayıcının sesine geçilir, arayüz "okunuyor"da kalmaz.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const S = __T;
const FAKE = readFileSync(S + "/e2e/fake-speech.js", "utf8");
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext();
await ctx.addInitScript(FAKE);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => { if (m.type() === "warning") console.log("  [uyarı] " + m.text().slice(0, 150)); });
await p.goto("http://127.0.0.1:8080/gk-tts/page.php?w=worker-hang.js&b=main");
await p.waitForFunction(() => window.GozKulak);
await p.evaluate(() => GozKulak.open());
const sh = (fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
await sh("root.querySelector('.gk-play').click();");
await p.waitForTimeout(400);
await sh("root.querySelector('.gk-ask-yes').click();");
const t0 = Date.now();
await p.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 60000 });
console.log("geçiş:", Math.round((Date.now() - t0) / 1000), "sn sonra |", await sh("return root.querySelector('.gk-play-label').textContent + ' | ' + root.querySelector('.gk-tts-status').textContent + ' | ' + root.querySelector('.gk-tts-note').textContent;"));
console.log("tarayıcı sesi ilk cümle:", await p.evaluate(() => window.__spoken[0].text.slice(0, 40)));
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü
const BASE = "http://localhost:8080";
const b = await chromium.launch();
const errs = [];
async function login(ctx) { const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); await p.goto(BASE + "/wp-login.php"); await p.fill("#user_login", "admin"); await p.fill("#user_pass", "admin"); await p.click("#wp-submit"); await p.waitForLoadState("networkidle"); return p; }
const ready = (p) => p.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
// Mobil
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
let p = await login(m);
await p.goto(BASE + "/?p=6"); await ready(p);
await p.evaluate(() => localStorage.removeItem("gozkulak:v1"));
await p.evaluate(() => document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-btn").click());
await p.waitForTimeout(200);
console.log("mobil panel:", await p.evaluate(() => { const r = document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-panel").getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), innerWidth].join(","); }));
await p.screenshot({ path: (process.argv[2] || __T + "/shots") + "/m12-mobile.png" });
// Twenty Seventeen: yapışkan menü + koyu mod
const d = await b.newContext({ viewport: { width: 1280, height: 800 } });
p = await login(d);
await p.goto(BASE + "/?p=6"); await ready(p);
await p.evaluate(() => localStorage.setItem("gozkulak:v1", JSON.stringify({ darkMode: true, fontSize: 1 })));
await p.reload(); await ready(p); await p.waitForTimeout(300);
await p.mouse.wheel(0, 900); await p.waitForTimeout(400);
console.log("17: sınıflar:", await p.evaluate(() => document.documentElement.className), "| düğme konumu:", await p.evaluate(() => { const r = document.querySelector("gozkulak-root").getBoundingClientRect(); return [Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom)].join(","); }));
await p.screenshot({ path: (process.argv[2] || __T + "/shots") + "/m12-17dark.png" });
console.log("hatalar:", errs.length ? errs : "yok");
await b.close();

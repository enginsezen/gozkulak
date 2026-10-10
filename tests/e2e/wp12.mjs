import { chromium } from "playwright";
import { fileURLToPath as __f } from "node:url";
const __T = __f(new globalThis.URL("..", import.meta.url)).replace(/\/$/, ""); // tests/
const __R = __f(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, ""); // depo kökü

const BASE = "http://localhost:8080";
const POST = BASE + "/?p=6";
const SHOTS = process.argv[2] || __T + "/shots";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error" && !/TUNNEL|gravatar/i.test(m.text())) errs.push("console: " + m.text()); });

await p.goto(BASE + "/wp-login.php");
await p.fill("#user_login", "admin");
await p.fill("#user_pass", "admin");
await p.click("#wp-submit");
await p.waitForLoadState("networkidle");

const ready = async () => p.waitForFunction(() => { const h = document.querySelector("gozkulak-root"); return h && getComputedStyle(h).display !== "none"; });
const sh = (fn, arg) => p.evaluate(([f, a]) => { const host = document.querySelector("gozkulak-root"); return new Function("host", "root", "a", f)(host, host.shadowRoot, a); }, [fn, arg]);
const tiles = () => sh(`return [...root.querySelectorAll('.gk-tile')].map(t => t.querySelector('.gk-tile-label').textContent + '=' + t.getAttribute('aria-pressed') + '/' + t.querySelector('.gk-tile-state').textContent);`);
const clickTile = (label) => sh(`const t = [...root.querySelectorAll('.gk-tile')].find(t => t.querySelector('.gk-tile-label').textContent === a); t.click(); return true;`, label);
const cls = () => p.evaluate(() => document.documentElement.className);
const pSize = () => p.evaluate(() => getComputedStyle(document.querySelector(".entry-content p, .wp-block-post-content p")).fontSize);

await p.goto(POST);
await ready();
await p.evaluate(() => localStorage.removeItem("gozkulak:v1"));
await p.reload();
await ready();
const base = await pSize();
console.log("paragraf özgün boyutu:", base);

// Kısayol ile aç
await p.keyboard.press("Alt+Shift+KeyG");
console.log("kısayol ile açık:", await sh(`return !root.querySelector('#gk-panel').hidden;`));
console.log("kutular:", (await tiles()).join(" | "));
await p.screenshot({ path: SHOTS + "/m12-panel.png" });

// Yazı boyutu +2
await sh(`root.querySelector('.gk-step-up').click(); root.querySelector('.gk-step-up').click(); return 1;`);
console.log("yazı +2:", await pSize(), "| değer:", await sh(`return root.querySelector('.gk-step-value').textContent;`), "| panel yazı boyutu:", await sh(`return getComputedStyle(root.querySelector('.gk-tile-label')).fontSize;`));
// Dinamik içerik: yeni paragraf katlanmamalı
const dyn = await p.evaluate(async () => {
	const host = document.querySelector(".entry-content, .wp-block-post-content");
	const np = document.createElement("p");
	np.textContent = "Sonradan eklenen paragraf.";
	host.append(np);
	await new Promise((r) => setTimeout(r, 100));
	return getComputedStyle(np).fontSize;
});
console.log("sonradan eklenen paragraf:", dyn);

// Tüm kutuları sırayla aç ve sınıfları kontrol et
for (const label of ["Satır aralığı", "Harf aralığı", "Yüksek kontrast", "Okunaklı yazı", "Bağlantıları vurgula", "Büyük imleç"]) await clickTile(label);
await p.waitForTimeout(400);
console.log("sınıflar:", await cls(), "| page.css:", await p.evaluate(() => !!document.getElementById("gozkulak-page-css")));
console.log("paragraf satır aralığı / harf aralığı / yazı tipi:", await p.evaluate(() => { const cs = getComputedStyle(document.querySelector(".entry-content p, .wp-block-post-content p")); return [cs.lineHeight, cs.letterSpacing, cs.fontFamily.split(",")[0], cs.backgroundColor, cs.color].join(" ; "); }));
console.log("panel etkilenmedi mi:", await sh(`const cs = getComputedStyle(root.querySelector('.gk-tile-label')); return [cs.lineHeight, cs.letterSpacing, cs.fontFamily.split(',')[0], getComputedStyle(root.querySelector('.gk-panel')).backgroundColor].join(' ; ');`));
await p.screenshot({ path: SHOTS + "/m12-contrast.png" });

// Koyu mod yüksek kontrastı kapatmalı
await clickTile("Koyu mod");
console.log("koyu mod sonrası:", await cls());
await sh(`root.querySelector('.gk-close').click(); return 1;`);
await p.screenshot({ path: SHOTS + "/m12-dark.png" });
await p.keyboard.press("Alt+Shift+KeyG");

// Gri tonlama + maske
await clickTile("Gri tonlama");
await clickTile("Okuma maskesi");
await p.mouse.move(400, 300);
await p.waitForTimeout(200);
console.log("filtre:", await p.evaluate(() => getComputedStyle(document.documentElement).filter), "| katman:", await p.evaluate(() => { const o = document.querySelector("gozkulak-overlay"); if (!o) return "yok"; const top = o.shadowRoot.querySelector(".gk-mask-top"); return "maske üst yüksekliği " + getComputedStyle(top).height; }));
await clickTile("Okuma cetveli");
console.log("cetvel açınca maske:", (await tiles()).filter((t) => /Okuma/.test(t)).join(" | "));
await clickTile("Animasyonları durdur");
await clickTile("Görselleri gizle");
console.log("görsel görünürlüğü:", await p.evaluate(() => { const i = document.querySelector("img"); return i ? getComputedStyle(i).visibility : "görsel yok"; }));

// Yeniden yükle: tercihler korunmalı
await p.reload();
await ready();
await p.waitForTimeout(300);
console.log("yeniden yüklemede sınıflar:", await cls(), "| yazı:", await pSize());
console.log("kayıt:", await p.evaluate(() => localStorage.getItem("gozkulak:v1")));
await p.screenshot({ path: SHOTS + "/m12-reload.png" });

// Sıfırla
await p.keyboard.press("Alt+Shift+KeyG");
await sh(`root.querySelector('.gk-reset').click(); return 1;`);
await p.waitForTimeout(200);
console.log("sıfırlama sonrası sınıflar:", JSON.stringify(await cls()), "| yazı:", await pSize(), "| satır içi stil kaldı mı:", await p.evaluate(() => document.querySelectorAll("[style*='font-size']").length), "| kayıt:", await p.evaluate(() => localStorage.getItem("gozkulak:v1")), "| katman:", await p.evaluate(() => !!document.querySelector("gozkulak-overlay")?.isConnected));

// Esc kapatır, odak düğmeye döner
await p.keyboard.press("Escape");
console.log("Esc:", await sh(`return [!root.querySelector('#gk-panel').hidden, root.activeElement && root.activeElement.className].join(' ');`));

console.log("\nHATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

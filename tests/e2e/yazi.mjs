// Menü başlıkları büyük harfle yazılır: Türkçe sayfada "Sesli okuma" → "SESLİ OKUMA" (I değil İ).
// Okunaklı yazı: Atkinson Hyperlegible Next eklentinin kendi klasöründen gelir ve Türkçe harflerin hepsini
// bu yazı tipiyle çizer. Seçenek kapalıyken yazı tipi dosyası indirilmez.
import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
async function open(prefs) {
	const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
	const p = await ctx.newPage();
	const fonts = [];
	p.on("request", (r) => { if (/\.woff2/.test(r.url())) fonts.push(r.url().split("/").pop()); });
	p.on("response", (r) => { if (/\.woff2/.test(r.url()) && !r.ok()) errs.push("yazı tipi indirilemedi: " + r.status() + " " + r.url()); });
	p.on("pageerror", (e) => errs.push(e.message));
	await p.goto("http://127.0.0.1:8080/gk-mock/");
	if (prefs) {
		await p.evaluate((v) => localStorage.setItem("gozkulak:v1", JSON.stringify(v)), prefs);
		await p.reload();
	}
	await p.waitForFunction(() => window.GozKulak);
	await p.waitForTimeout(1500);
	return { p, fonts };
}

let { p, fonts } = await open(null);
await p.evaluate(() => GozKulak.open());
const titles = await p.evaluate(() => [...document.querySelector("gozkulak-root").shadowRoot.querySelectorAll(".gk-group-title")].map((x) => [x.innerText, x.textContent.toLocaleUpperCase("tr")]));
console.log("menü başlıkları:", titles.map((t) => t[0]).join(" | "));
for (const [shown, want] of titles) if (shown !== want) errs.push("büyük harf Türkçe değil: " + shown + " (beklenen: " + want + ")");
console.log("seçenek kapalı, indirilen yazı tipi:", fonts.length);
if (fonts.length) errs.push("seçenek kapalıyken yazı tipi indirildi: " + fonts.join(", "));
await p.context().close();

({ p, fonts } = await open({ readableFont: true }));
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate(async () => {
	const el = document.querySelector("main p, p");
	el.textContent = "Iğdır'da şöyle: İŞÇİ ÖĞÜT çığ ışık";
	await document.fonts.load('16px "Atkinson Hyperlegible Next"', el.textContent);
	const used = getComputedStyle(el).fontFamily;
	// Her harf yazı tipinde var mı: yazı tipi yüklü ve aralıkları karşılıyor
	const ok = document.fonts.check('16px "Atkinson Hyperlegible Next"', "çğıöşüÇĞİÖŞÜ");
	const faces = [...document.fonts].filter((f) => f.family.replace(/"/g, "") === "Atkinson Hyperlegible Next").map((f) => f.status);
	return { used, ok, faces };
});
fonts = [...new Set(fonts)].sort();
console.log("seçenek açık:", JSON.stringify(r), "| indirilen:", fonts.join(", "));
if (!/^"?Atkinson Hyperlegible Next/.test(r.used)) errs.push("yazı tipi uygulanmadı: " + r.used);
if (!r.ok) errs.push("Türkçe harfler yazı tipinde değil");
if (fonts.length !== 2) errs.push("iki dosya (latin, latin-ext) bekleniyordu: " + fonts.join(", "));
// Ekran görüntüsünde harfler: Chromium'un yazı tipi seçimi (sistemde Atkinson yok)
const shot = await p.evaluate(() => { const el = document.querySelector("main p, p"); const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
await p.screenshot({ path: "shots/yazi-atkinson.png", clip: { x: shot[0], y: shot[1], width: Math.min(700, shot[2]), height: Math.max(30, shot[3]) } });
console.log("HATALAR:", errs.length ? errs.join("\n") : "yok");
await b.close();

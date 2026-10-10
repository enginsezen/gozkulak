// Hazır ses hazırlama (Ayarlar → GözKulak → Hazır ses), WordPress Playground'da gerçek modelle.
// Sayfa ekran dışı çerçevede açılır, birimler üretilip yüklenir, liste ön yüze gider; ikinci
// hazırlamada yeni dosya üretilmez; metin değişince yalnızca değişen birim üretilir; temizleme ve silme.
// Sunucu: npm run wp. Model dosyaları GK_TTS adresinden iner (varsayılan https://tts.sezen.pro/).
import { chromium } from "playwright";

const WP = process.env.GK_WP || "http://127.0.0.1:9400";
const TTS = process.env.GK_TTS || "https://tts.sezen.pro/";
const b = await chromium.launch();
const errs = [];
const check = (name, ok, detail) => {
	console.log((ok ? "✓ " : "✗ ") + name + (detail ? " — " + detail : ""));
	if (!ok) errs.push(name);
};

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("dialog", (d) => d.accept());
await p.goto(WP + "/wp-login.php");
await p.fill("#user_login", "admin");
await p.fill("#user_pass", "password");
await p.click("#wp-submit");
await p.waitForLoadState("networkidle");

const SETTINGS = WP + "/wp-admin/options-general.php?page=gozkulak";
await p.goto(SETTINGS);
await p.fill("#gozkulak-tts-base", TTS);
await p.click("#submit");
await p.waitForLoadState("networkidle");
check("ses dosyalarının adresi kaydedildi", (await p.inputValue("#gozkulak-tts-base")) === TTS);

const row = (id) => p.locator(`#gozkulak-prepare tr[data-id="${id}"]`);
const state = async (id) => (await row(id).locator(".gozkulak-prep-state").textContent()).trim();
const status = async () => (await p.locator(".gozkulak-prep-status").textContent()).trim();
check("Hazır ses bölümünde sayfa listelenir", (await row(500).count()) === 1);
check("taslak sayfa listelenmez", (await row(501).count()) === 0);

async function run(id) {
	await p.locator(`#gozkulak-prepare tr[data-id="${id}"] .gozkulak-prep-pick`).check();
	await p.click(".gozkulak-prep-run");
	await p.waitForFunction(() => /^(Bitti|Durduruldu)/.test(document.querySelector(".gozkulak-prep-status").textContent), null, { timeout: 600000 });
	return status();
}

// Ön yüzde sayfanın listesi ve sayfadaki GözKulak'ın birimleri
async function front() {
	const f = await ctx.newPage();
	await f.goto(WP + "/?page_id=500");
	await f.waitForFunction(() => window.GozKulak && window.GozKulak.units);
	const out = await f.evaluate(async () => {
		const cfg = JSON.parse(document.getElementById("gozkulak-config").textContent);
		const units = await window.GozKulak.units();
		const ac = new AudioContext();
		const decoded = [];
		for (const u of (cfg.audio ? cfg.audio.files : [])) {
			const r = await fetch(cfg.audio.base + u.slice(0, 2) + "/" + u + ".ogg");
			try {
				const buf = await ac.decodeAudioData(await r.arrayBuffer());
				decoded.push(buf.duration);
			} catch (e) {
				decoded.push(-1);
			}
		}
		return { files: cfg.audio ? cfg.audio.files : [], units: units.map((u) => u.hash), texts: units.map((u) => u.text), decoded };
	});
	await f.close();
	return out;
}

let s = await run(500);
check("ilk hazırlama bitti", /^Bitti\. \d+ yeni ses dosyası/.test(s), s);
const first = Number((/(\d+) yeni/.exec(s) || [])[1]);
let st = await state(500);
check("satırda hazır sayısı", /^(\d+) \/ \1 hazır$/.test(st), st);
let fr = await front();
console.log("  birimler:", JSON.stringify(fr.texts), "süreler:", fr.decoded.map((x) => x.toFixed(2)).join(", "));
check("ön yüzdeki liste sayfanın birimleriyle aynı", fr.files.length > 0 && JSON.stringify([...fr.files].sort()) === JSON.stringify([...new Set(fr.units)].sort()), fr.files.length + " dosya");
check("yeni dosya sayısı birim sayısına eşit", first === new Set(fr.units).size, String(first));
check("dosyalar tarayıcıda çözülüyor", fr.decoded.length > 0 && fr.decoded.every((x) => x > 0.3), fr.decoded.join(","));

await p.reload();
s = await run(500);
check("ikinci hazırlamada yeni dosya üretilmez", /^Bitti\. 0 yeni ses dosyası/.test(s), s);

// Metin değişir: bir cümle eklenir. Yalnızca o birim üretilir; eski birimler yeniden kullanılır.
const nonce = await p.evaluate(async (u) => (await fetch(u)).text(), WP + "/wp-admin/admin-ajax.php?action=rest-nonce");
const upd = await p.evaluate(async ([u, n]) => (await fetch(u, {
	method: "POST", headers: { "X-WP-Nonce": n, "Content-Type": "application/json" },
	body: JSON.stringify({ content: "<p>Merhaba dünya. Bu bir deneme sayfasıdır. Müze pazartesi günleri kapalıdır.</p>" }),
})).status, [WP + "/?rest_route=/wp/v2/pages/500", nonce]);
check("sayfa metni güncellendi", upd === 200, String(upd));
await p.reload();
s = await run(500);
check("değişen metinde yalnızca yeni birim üretilir", /^Bitti\. 1 yeni ses dosyası/.test(s), s);
fr = await front();
check("liste yeni birimleri içerir", JSON.stringify([...fr.files].sort()) === JSON.stringify([...new Set(fr.units)].sort()), fr.files.length + " dosya");

await p.click(".gozkulak-prep-cleanup");
await p.waitForFunction(() => /silindi/.test(document.querySelector(".gozkulak-prep-status").textContent));
s = await status();
check("temizleme: kullanılmayan dosyalar silindi", /^Kullanılmayan \d+ dosya silindi\.$/.test(s), s);

await p.click(".gozkulak-prep-purge");
await p.waitForFunction(() => /Bütün hazır sesler silindi/.test(document.querySelector(".gozkulak-prep-status").textContent));
fr = await front();
check("silmeden sonra ön yüzde liste yok", fr.files.length === 0);
await p.reload();
check("silmeden sonra satırda dosya yok", (await state(500)) === "—", await state(500));

console.log("HATA SAYISI:", errs.length, errs.join(" | "));
await b.close();

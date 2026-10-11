// README görselleri (docs/img/): "Tarayıcıda dene" deneme sitesinin aynısı, yerel WordPress Playground'da
// (port 9404, depo bağlanır). Sitelerden görüntü alınmaz: görsellerde site ya da şirket adı olmaz.
// Doğal ses modeli GK_TTS adresindeki ses sunucusundan iner; verilmezse yedek kaynaklardan (Hugging Face, jsDelivr).
//
//   cd tests && npm run gorseller        (kendi sunucusunu açar ve kapatır; ~2 dk)
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const WP = "http://127.0.0.1:9404";
const OUT = join(R, "docs/img");
const TTS = process.env.GK_TTS || "";

// docs/playground.json: eklentiyi GitHub'dan kuran adım yerine depodaki eklenti etkinleştirilir. Kendiliğinden
// giriş kapalı (görüntüler ziyaretçi gözüyle; yönetici sayfası için giriş yapılır).
const bp = JSON.parse(readFileSync(join(R, "docs/playground.json"), "utf8"));
delete bp.login;
bp.steps = [{ step: "activatePlugin", pluginPath: "gozkulak/gozkulak.php" }, ...bp.steps.filter((s) => s.step !== "installPlugin")];
if (TTS) bp.steps.push({ step: "runPHP", code: "<?php require '/wordpress/wp-load.php'; $s = get_option('gozkulak_settings'); $s['tts_base'] = " + JSON.stringify(TTS) + "; update_option('gozkulak_settings', $s);" });
const work = mkdtempSync(join(tmpdir(), "gk-gorsel-"));
writeFileSync(join(work, "blueprint.json"), JSON.stringify(bp));

const server = spawn("npx", ["-y", "@wp-playground/cli@3.1.57", "server", "--php=8.3", "--port=9404", "--workers=1", "--mount=..:/wordpress/wp-content/plugins/gozkulak", "--blueprint=" + join(work, "blueprint.json")], { cwd: T, stdio: ["ignore", process.env.GK_LOG ? "inherit" : "ignore", process.env.GK_LOG ? "inherit" : "ignore"], detached: true });
let b;
try {
	for (let i = 0; ; i++) {
		try {
			// Sunucu, kurulum adımları bitmeden yanıt vermeye başlar: ana sayfada eklenti görünene kadar beklenir
			if ((await (await fetch(WP + "/")).text()).includes("gozkulak-config")) break;
		} catch {}
		if (i > 120) throw new Error("Playground açılmadı");
		await new Promise((r) => setTimeout(r, 2000));
	}
	b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });

	// Ziyaretçi (oturum yok: yönetici çubuğu görünmez)
	const visit = async ({ width = 1280, height = 800, mobile = false, prefs } = {}) => {
		const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
		if (prefs) await ctx.addInitScript((v) => localStorage.setItem("gozkulak:v1", v), JSON.stringify(prefs));
		const p = await ctx.newPage();
		await p.goto(WP + "/");
		await p.waitForFunction(() => window.GozKulak);
		await p.evaluate(() => document.fonts.ready);
		return p;
	};
	const sh = (p, fn) => p.evaluate((f) => new Function("root", f)(document.querySelector("gozkulak-root").shadowRoot), fn);
	const shot = async (p, name) => {
		await p.waitForTimeout(500);
		await p.screenshot({ path: join(OUT, name) });
		console.log("✓ " + name);
		await p.context().close();
	};

	// 1) Menü açık
	let p = await visit();
	await p.evaluate(() => GozKulak.open());
	await shot(p, "menu.png");

	// 2) Doğal sesle okuma: vurgulanan cümle ve mini oynatıcı (panel kapalı)
	p = await visit();
	await p.evaluate(() => GozKulak.open());
	await sh(p, "root.querySelector('.gk-play').click();");
	await p.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden);
	await sh(p, "root.querySelector('.gk-ask-yes').click();");
	await p.evaluate(() => GozKulak.close());
	await p.waitForFunction(() => {
		const h = CSS.highlights.get("gk-read");
		return h && h.size && /^Türkçe ses/.test([...h][0].toString().trim());
	}, null, { timeout: 300000 });
	await shot(p, "okuma.png");

	// 3) Telefon: koyu mod ve büyük yazı (menü kapalı)
	p = await visit({ width: 390, height: 844, mobile: true, prefs: { darkMode: true, fontSize: 2 } });
	await shot(p, "telefon.png");

	// 4) Yönetici: Ayarlar → GözKulak
	const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
	p = await ctx.newPage();
	await p.goto(WP + "/wp-login.php");
	await p.fill("#user_login", "admin");
	await p.fill("#user_pass", "password");
	await p.click("#wp-submit");
	await p.waitForLoadState("networkidle");
	await p.goto(WP + "/wp-admin/options-general.php?page=gozkulak");
	// Deneme sayfası hazırlanır: tabloda hazır ses sayısı görünür
	p.on("dialog", (d) => d.accept());
	await p.locator("#gozkulak-prepare tbody tr .gozkulak-prep-pick").first().check();
	await p.click(".gozkulak-prep-run");
	await p.waitForFunction(() => /^Bitti/.test(document.querySelector(".gozkulak-prep-status").textContent), null, { timeout: 600000 });
	await p.reload();
	// Sesli okuma ayarları (okunacak alan, okunuş sözlüğü, ses dosyaları) ve hazır ses listesi
	const y = await p.locator("h2:text-is('Sesli okuma')").evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
	await p.evaluate((top) => window.scrollTo(0, top - 50), y);
	await p.waitForTimeout(300);
	await p.screenshot({ path: join(OUT, "ayarlar.png") });
	console.log("✓ ayarlar.png");
	await p.locator("#gozkulak-prepare").screenshot({ path: join(OUT, "hazir-ses.png") });
	console.log("✓ hazir-ses.png");
	await ctx.close();
} finally {
	if (b) await b.close();
	try {
		process.kill(-server.pid);
	} catch {}
	rmSync(work, { recursive: true, force: true });
}

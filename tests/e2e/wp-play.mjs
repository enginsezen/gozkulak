// Ziyaretçi tarafında hazır ses (WordPress Playground, gerçek model). Sayfa yönetici panelinde hazırlanır;
// ardından önbelleği boş bir tarayıcıda okunur:
//  1) Bütün cümleler hazır: onay sorulmaz, model ve Worker inmez, ses <audio> ile çalar, vurgu ilerler,
//     hız perde korunarak ve birim baştan okunmadan değişir, duraklat/devam çalışır.
//  2) Sonradan bir cümle eklenir (hazır değil): onay sorulur; hazır cümleler dosyadan, yenisi canlı üretilir.
// Sunucu: npm run wp. Model dosyaları GK_TTS adresinden iner (varsayılan https://tts.sezen.pro/).
import { chromium } from "playwright";

const WP = process.env.GK_WP || "http://127.0.0.1:9400";
const TTS = process.env.GK_TTS || "https://tts.sezen.pro/";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const errs = [];
const check = (name, ok, detail) => {
	console.log((ok ? "✓ " : "✗ ") + name + (detail ? " — " + detail : ""));
	if (!ok) errs.push(name);
};

// <audio> çalmaları, Web Audio parçaları ve vurgulanan cümleler kaydedilir.
const SPY = `(() => {
	window.__media = [];
	window.__audio = { starts: 0, first: 0 };
	window.__hl = [];
	const play = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function () {
		window.__el = this;
		window.__media.push({ t: performance.now(), rate: this.playbackRate, pitch: this.preservesPitch });
		return play.call(this);
	};
	const start = AudioBufferSourceNode.prototype.start;
	AudioBufferSourceNode.prototype.start = function (...a) {
		if (this.buffer && this.buffer.length > 1) {
			if (!__audio.starts) __audio.first = performance.now();
			__audio.starts++;
		}
		return start.apply(this, a);
	};
	setInterval(() => {
		const h = window.CSS && CSS.highlights && CSS.highlights.get("gk-read");
		const t = h && h.size ? [...h][0].toString().trim() : "";
		if (t && __hl[__hl.length - 1] !== t) __hl.push(t);
	}, 40);
})();`;

async function login(ctx) {
	const p = await ctx.newPage();
	p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
	p.on("dialog", (d) => d.accept());
	await p.goto(WP + "/wp-login.php");
	await p.fill("#user_login", "admin");
	await p.fill("#user_pass", "password");
	await p.click("#wp-submit");
	await p.waitForLoadState("networkidle");
	return p;
}

// ---------- hazırlık (yönetici) ----------
const actx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const adm = await login(actx);
const SETTINGS = WP + "/wp-admin/options-general.php?page=gozkulak";
await adm.goto(SETTINGS);
await adm.fill("#gozkulak-tts-base", TTS);
await adm.click("#submit");
await adm.waitForLoadState("networkidle");

const nonce = await adm.evaluate(async (u) => (await fetch(u)).text(), WP + "/wp-admin/admin-ajax.php?action=rest-nonce");
const setContent = (html) => adm.evaluate(async ([u, n, c]) => (await fetch(u, {
	method: "POST", headers: { "X-WP-Nonce": n, "Content-Type": "application/json" }, body: JSON.stringify({ content: c }),
})).status, [WP + "/?rest_route=/wp/v2/pages/500", nonce, html]);
const restPost = (path) => adm.evaluate(async ([u, n]) => (await fetch(u, { method: "POST", headers: { "X-WP-Nonce": n } })).status,
	[WP + "/?rest_route=/gozkulak/v1/" + path, nonce]);

check("eski hazır sesler silindi", (await restPost("purge")) === 200);
check("sayfa metni yazıldı", (await setContent("<p>Merhaba dünya. Bu bir deneme sayfasıdır.</p>")) === 200);
await adm.goto(SETTINGS);
await adm.locator('#gozkulak-prepare tr[data-id="500"] .gozkulak-prep-pick').check();
await adm.click(".gozkulak-prep-run");
await adm.waitForFunction(() => /^(Bitti|Durduruldu)/.test(document.querySelector(".gozkulak-prep-status").textContent), null, { timeout: 600000 });
const prep = (await adm.locator(".gozkulak-prep-status").textContent()).trim();
check("sayfa hazırlandı", /^Bitti\. 2 yeni ses dosyası/.test(prep), prep);

// ---------- ziyaretçi (yönetici oturumu, önbelleği boş tarayıcı: eklenti test modunda) ----------
const vctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await vctx.addInitScript(SPY);
await login(vctx);
const v = await vctx.newPage();
v.on("pageerror", (e) => errs.push("pageerror: " + e.message));
let model = [];
v.on("request", (r) => {
	const u = r.url();
	if (u.startsWith(TTS) || /gozkulak-tts-worker/.test(u)) model.push(u.split("/").pop());
});
const sh = (fn, arg) => v.evaluate(([f, a]) => new Function("root", "a", f)(document.querySelector("gozkulak-root").shadowRoot, a), [fn, arg]);
const status = () => sh("return root.querySelector('.gk-tts-status').textContent + ' | ' + root.querySelector('.gk-tts-note').textContent;");
const label = () => sh("return root.querySelector('.gk-play-label').textContent;");
const clickPlay = () => sh("root.querySelector('.gk-play').click(); return 1;");
const askShown = () => sh("return !root.querySelector('.gk-ask').hidden;");
const finished = () => v.waitForFunction(() => {
	const r = document.querySelector("gozkulak-root").shadowRoot;
	return /dinle|listen/i.test(r.querySelector(".gk-play-label").textContent);
}, null, { timeout: 300000 });

async function openPage() {
	model = [];
	await v.goto(WP + "/?page_id=500");
	await v.waitForFunction(() => window.GozKulak);
	await v.evaluate(() => GozKulak.open());
}

// 1) Bütün cümleler hazır
await openPage();
await v.evaluate(() => (window.__click = performance.now()));
await clickPlay();
await v.waitForTimeout(400);
check("onay sorulmaz", !(await askShown()));
await v.waitForFunction(() => window.__media.length > 0, null, { timeout: 10000 });
// Linux'taki Chrome'da tarayıcının sesi yok: sesler beklenmeden hemen başlar.
const wait1 = await v.evaluate(() => Math.round(__media[0].t - __click));
check("tıklamadan sonra 1 sn içinde başlar", wait1 < 1000, wait1 + " ms");
const st1 = await status();
check("hazır ses çalıyor", (await label()) !== "Dinle" && /Tanı: hazır ses/.test(st1), st1);
const m0 = await v.evaluate(() => ({ rate: __el.playbackRate, pitch: __el.preservesPitch, src: __el.src.slice(0, 5) }));
check("ses <audio> ile, dosyadan çalar", m0.src === "blob:" && m0.pitch === true, JSON.stringify(m0));
// Hız: birim baştan okunmaz, öğenin hızı değişir
const plays = await v.evaluate(() => __media.length);
await sh("root.querySelector('.gk-step-up').click(); return 1;");
await v.waitForTimeout(200);
const m1 = await v.evaluate(() => ({ rate: __el.playbackRate, pitch: __el.preservesPitch, plays: __media.length }));
check("hız perdeyi koruyarak değişir, birim baştan okunmaz", m1.rate === 1.2 && m1.pitch && m1.plays === plays, JSON.stringify(m1));
// Duraklat / devam
await clickPlay();
await v.waitForTimeout(150);
const tA = await v.evaluate(() => __el.currentTime);
await v.waitForTimeout(600);
const pz = await v.evaluate(() => ({ paused: __el.paused, t: __el.currentTime }));
check("duraklat: ses durur", pz.paused && Math.abs(pz.t - tA) < 0.01 && (await label()) === "Devam et", JSON.stringify(pz) + " " + (await label()));
await clickPlay();
await v.waitForTimeout(300);
check("devam: ses sürer", await v.evaluate((t) => !__el.paused && __el.currentTime > t, pz.t));
await finished();
const hl1 = await v.evaluate(() => __hl);
// Başlık ("Deneme") kısa: "Merhaba dünya." ile tek dosya; vurgu birimin içinde ikinci cümleye de geçer.
check("vurgu cümleleri sırayla izler (birleşik birim dahil)", JSON.stringify(hl1) === JSON.stringify(["Deneme", "Merhaba dünya.", "Bu bir deneme sayfasıdır."]), JSON.stringify(hl1));
check("okuma bitti", /dinle/i.test(await label()), await label());
check("model ve Worker inmedi", model.length === 0, model.join(", "));
check("Web Audio kullanılmadı", (await v.evaluate(() => __audio.starts)) === 0);

// "Sonraki" birimin ortasına gitmez: "Deneme Merhaba dünya." biriminden sonraki birime geçer.
await openPage();
await v.evaluate(() => { __hl.length = 0; });
await clickPlay();
await v.waitForFunction(() => window.__media.length > 0 && __hl.length > 0, null, { timeout: 10000 });
await sh("root.querySelectorAll('.gk-ctl')[1].click(); return 1;");
await v.waitForTimeout(500);
const hl2 = await v.evaluate(() => __hl);
check("sonraki: bir sonraki hazır birime geçer", hl2[hl2.length - 1] === "Bu bir deneme sayfasıdır." && !hl2.includes("Merhaba dünya."), JSON.stringify(hl2));
await sh("root.querySelectorAll('.gk-ctl')[2].click(); return 1;");

// 2) Sonradan bir cümle eklendi: hazır değil
check("sayfaya cümle eklendi", (await setContent("<p>Merhaba dünya. Bu bir deneme sayfasıdır. Müze pazartesi günleri kapalıdır.</p>")) === 200);
await openPage();
await clickPlay();
await v.waitForFunction(() => !document.querySelector("gozkulak-root").shadowRoot.querySelector(".gk-ask").hidden, null, { timeout: 10000 });
check("eksik cümle için onay sorulur", true);
check("onaydan önce ses çalmaz", (await v.evaluate(() => __media.length + __audio.starts)) === 0);
await sh("root.querySelector('.gk-ask-yes').click(); return 1;");
await finished();
const mix = await v.evaluate(() => ({ media: __media.length, first: __media[0] && __media[0].t, last: __media.length && __media[__media.length - 1].t, web: __audio.starts, webFirst: __audio.first, hl: __hl }));
check("hazır cümleler dosyadan çalar", mix.media === 2, String(mix.media));
check("eksik cümle canlı üretilir, hazırlardan sonra", mix.web > 0 && mix.webFirst > mix.last, JSON.stringify({ web: mix.web, last: Math.round(mix.last), webFirst: Math.round(mix.webFirst) }));
check("vurgu üç cümleyi izler", mix.hl.length >= 3 && /Müze/.test(mix.hl[mix.hl.length - 1]), JSON.stringify(mix.hl));
check("model indi", model.length > 0, model.length + " dosya");

// Temizlik
await restPost("purge");
await setContent("<p>Merhaba dünya. Bu bir deneme sayfasıdır.</p>");
console.log("HATA SAYISI:", errs.length, errs.join(" | "));
await b.close();

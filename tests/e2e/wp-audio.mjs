// Hazır ses REST uçları (WordPress Playground). Yalnızca yöneticiler yükleyebilir; dosya adı, içerik
// ve sayfa denetlenir; ön yüze yalnızca sayfanın listesi gider; temizleme ve silme çalışır.
// Sunucu: npm run wp (tests/README.md). Adres: GK_WP (varsayılan http://127.0.0.1:9400)
import { chromium } from "playwright";

const WP = process.env.GK_WP || "http://127.0.0.1:9400";
const b = await chromium.launch();
const errs = [];
const check = (name, ok, detail) => {
	console.log((ok ? "✓ " : "✗ ") + name + (detail ? " — " + detail : ""));
	if (!ok) errs.push(name);
};

const H1 = "0123456789abcdef0123456789abcdef";
const H2 = "fedcba9876543210fedcba9876543210";
const H3 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // hiç yüklenmez

// Sunucu yalnızca başlığa bakar: ilk sayfa "OggS", 28. bayttan "OpusHead".
function fakeOgg(size = 200) {
	const a = new Uint8Array(size);
	a.set([0x4f, 0x67, 0x67, 0x53], 0);
	a[26] = 1;
	a[27] = 19;
	a.set([..."OpusHead"].map((c) => c.charCodeAt(0)), 28);
	return [...a];
}

async function login(user, pass) {
	const ctx = await b.newContext();
	const p = await ctx.newPage();
	await p.goto(WP + "/wp-login.php");
	await p.fill("#user_login", user);
	await p.fill("#user_pass", pass);
	await p.click("#wp-submit");
	await p.waitForLoadState("networkidle");
	return p;
}

// Sayfanın içinden istek: tarayıcının çerezleriyle (yönetici panelindeki gibi)
const req = (p, path, { body, json, nonce } = {}) => p.evaluate(async ([url, body, json, nonce]) => {
	const headers = {};
	if (nonce) headers["X-WP-Nonce"] = nonce;
	let data;
	if (json) {
		headers["Content-Type"] = "application/json";
		data = JSON.stringify(json);
	} else if (body) {
		headers["Content-Type"] = "application/octet-stream";
		data = new Uint8Array(body);
	}
	const r = await fetch(url, { method: "POST", headers, body: data, credentials: "same-origin" });
	return { status: r.status, data: await r.json().catch(() => null) };
}, [WP + "/?rest_route=/gozkulak/v1" + path, body || null, json || null, nonce || ""]);

const nonceOf = (p) => p.evaluate(async (u) => (await fetch(u, { credentials: "same-origin" })).text(), WP + "/wp-admin/admin-ajax.php?action=rest-nonce");
const config = (p, path) => p.evaluate(async (u) => {
	const html = await (await fetch(u, { credentials: "same-origin" })).text();
	const m = /<script[^>]*id="gozkulak-config"[^>]*>([\s\S]*?)<\/script>/.exec(html);
	return m ? JSON.parse(m[1]) : null;
}, WP + path);

// ---------- oturumsuz ----------
const anon = await (await b.newContext()).newPage();
await anon.goto(WP + "/");
let r = await req(anon, "/audio/" + H1, { body: fakeOgg() });
check("oturumsuz yükleme reddedilir", r.status === 401, String(r.status));

// ---------- abone ----------
const sub = await login("abone", "abone-Parola-123");
r = await req(sub, "/audio/" + H1, { body: fakeOgg(), nonce: await nonceOf(sub) });
check("abone yükleyemez", r.status === 403, String(r.status));

// ---------- yönetici ----------
const adm = await login("admin", "password");
r = await req(adm, "/audio/" + H1, { body: fakeOgg() });
check("nonce'suz yönetici isteği reddedilir", r.status === 401 || r.status === 403, String(r.status));
const nonce = await nonceOf(adm);
check("REST nonce alındı", /^[0-9a-f]{10}$/.test(nonce), nonce);

r = await req(adm, "/audio/" + H1, { body: fakeOgg(), nonce });
check("geçerli dosya yüklenir", r.status === 200 && r.data && r.data.saved === H1, JSON.stringify(r.data));
r = await req(adm, "/audio/" + H2, { body: fakeOgg(300), nonce });
check("ikinci dosya yüklenir", r.status === 200, String(r.status));

const bad = fakeOgg();
bad[0] = 0x3c; // "<"
r = await req(adm, "/audio/" + H3, { body: bad, nonce });
check("Ogg olmayan içerik reddedilir", r.status === 400, String(r.status));
r = await req(adm, "/audio/" + H3, { body: fakeOgg(524289), nonce });
check("512 KB'tan büyük dosya reddedilir", r.status === 400, String(r.status));
r = await req(adm, "/audio/" + H3, { nonce });
check("boş gövde reddedilir", r.status === 400, String(r.status));
r = await req(adm, "/audio/../../x", { body: fakeOgg(), nonce });
check("geçersiz ad reddedilir", r.status === 404, String(r.status));
r = await req(adm, "/audio/" + H1.toUpperCase(), { body: fakeOgg(), nonce });
check("büyük harfli ad reddedilir", r.status === 400 || r.status === 404, String(r.status));

const guards = await adm.evaluate(async (us) => Promise.all(us.map(async (u) => {
	const x = await fetch(u);
	return x.status + ":" + (await x.text()).length;
})), [WP + "/wp-content/uploads/gozkulak/index.php", WP + "/wp-content/uploads/gozkulak/01/index.php"]);
check("klasörlerde boş index.php var (dizin listelenmez)", guards.every((g) => g === "200:0"), guards.join(" "));

const file = await adm.evaluate(async (u) => {
	const x = await fetch(u);
	return { status: x.status, size: (await x.arrayBuffer()).byteLength };
}, WP + "/wp-content/uploads/gozkulak/01/" + H1 + ".ogg");
check("dosya uploads/gozkulak altından sunulur", file.status === 200 && file.size === 200, JSON.stringify(file));

// ---------- sayfa listesi ----------
r = await req(adm, "/page/500", { json: { files: [H1, H1, H3] }, nonce });
check("liste kaydedilir, eksik dosya bildirilir", r.status === 200 && r.data.saved === 1 && r.data.missing.length === 1 && r.data.missing[0] === H3, JSON.stringify(r.data));
r = await req(adm, "/page/501", { json: { files: [H1] }, nonce });
check("taslak sayfaya liste yazılamaz", r.status === 404, String(r.status));
r = await req(adm, "/page/502", { json: { files: [H1] }, nonce });
check("şifreli sayfaya liste yazılamaz", r.status === 404, String(r.status));
r = await req(adm, "/page/500", { json: { files: ["<script>"] }, nonce });
check("geçersiz liste öğesi reddedilir", r.status === 400, String(r.status));
r = await req(adm, "/page/500", { json: { files: "x" }, nonce });
check("liste dizi değilse reddedilir", r.status === 400, String(r.status));

let cfg = await config(adm, "/?page_id=500");
check("ön yüzde sayfanın listesi var", !!(cfg && cfg.audio && cfg.audio.files.length === 1 && cfg.audio.files[0] === H1 && /\/wp-content\/uploads\/gozkulak\/$/.test(cfg.audio.base)), JSON.stringify(cfg && cfg.audio));
cfg = await config(adm, "/");
check("başka sayfada liste yok", !!cfg && !cfg.audio, JSON.stringify(cfg && cfg.audio));

// ---------- temizleme ve silme ----------
r = await req(adm, "/cleanup", { nonce });
check("temizleme yalnızca kullanılmayanı siler", r.status === 200 && r.data.deleted === 1, JSON.stringify(r.data));
const after = await adm.evaluate(async ([a, b2]) => [(await fetch(a)).status, (await fetch(b2)).status],
	[WP + "/wp-content/uploads/gozkulak/01/" + H1 + ".ogg", WP + "/wp-content/uploads/gozkulak/fe/" + H2 + ".ogg"]);
check("kullanılan dosya kalır, kullanılmayan gider", after[0] === 200 && after[1] === 404, after.join(","));

// Sayfa sonradan şifrelenir: liste ön yüze yazılmaz, temizlemede kaldırılır ve sesi silinir
r = await req(adm, "/page/500", { json: { files: [H1] }, nonce });
check("liste yeniden kaydedilir", r.status === 200 && r.data.saved === 1, JSON.stringify(r.data));
const wpReq = (p, path, json) => p.evaluate(async ([u, n, j]) => (await fetch(u, { method: "POST", headers: { "X-WP-Nonce": n, "Content-Type": "application/json" }, body: JSON.stringify(j), credentials: "same-origin" })).status, [WP + "/?rest_route=" + path, nonce, json]);
check("sayfa şifrelendi", (await wpReq(adm, "/wp/v2/pages/500", { password: "gizli" })) === 200);
cfg = await config(adm, "/?page_id=500");
check("şifreli sayfada liste yazılmaz", !!cfg && !cfg.audio, JSON.stringify(cfg && cfg.audio));
r = await req(adm, "/cleanup", { nonce });
const h1 = await adm.evaluate(async (u) => (await fetch(u)).status, WP + "/wp-content/uploads/gozkulak/01/" + H1 + ".ogg");
check("temizleme şifreli sayfanın sesini siler", r.status === 200 && r.data.deleted === 1 && h1 === 404, JSON.stringify(r.data) + " " + h1);
check("şifre kaldırıldı", (await wpReq(adm, "/wp/v2/pages/500", { password: "" })) === 200);

r = await req(sub, "/purge", { nonce: await nonceOf(sub) });
check("abone silemez", r.status === 403, String(r.status));
r = await req(adm, "/purge", { nonce });
check("hepsini sil", r.status === 200, String(r.status));
cfg = await config(adm, "/?page_id=500");
const gone = await adm.evaluate(async (u) => (await fetch(u)).status, WP + "/wp-content/uploads/gozkulak/01/" + H1 + ".ogg");
check("silmeden sonra dosya ve liste yok", !!cfg && !cfg.audio && gone === 404, gone + " " + JSON.stringify(cfg && cfg.audio));

console.log("HATA SAYISI:", errs.length);
await b.close();

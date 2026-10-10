// GitHub'dan imzalı güncelleme, uçtan uca: WordPress Playground (ayrı, port 9403) ve GitHub'ın yerine geçen
// yerel bir sunucu (port 9402: etiket listesi ve etiket arşivleri). Eklenti Playground'a zip'ten kurulur
// (depo bağlanmaz: güncelleme çalışma kopyasının üzerine yazmasın). Paketler bir deneme anahtarıyla imzalanır;
// eklenti bu anahtarı yalnızca geliştirme ortamında (WP_ENVIRONMENT_TYPE = local) kabul eder.
//
//   cd tests && node e2e/wp-update.mjs        (kendi sunucularını açar ve kapatır; ~3 dk)
import { execFileSync, spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { packageInto } from "../paket.mjs";

const T = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const R = fileURLToPath(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, "");
const WP = "http://127.0.0.1:9403";
const SRC = "http://127.0.0.1:9402/";
const errs = [];
const check = (name, ok, info) => {
	console.log((ok ? "✓ " : "✗ ") + name + (info ? " — " + info : ""));
	if (!ok) errs.push(name);
};

// ---------- paketler ----------
const work = mkdtempSync(join(tmpdir(), "gk-update-"));
const base = join(work, "taban");
packageInto(base);
const current = (/define\(\s*'GOZKULAK_VERSION',\s*'([^']+)'/.exec(readFileSync(join(base, "gozkulak.php"), "utf8")) || [])[1];

const key = generateKeyPairSync("ed25519");
const other = generateKeyPairSync("ed25519");
const pub = Buffer.from(key.publicKey.export({ format: "jwk" }).x, "base64url").toString("base64");

const list = (dir) => {
	const out = [];
	const walk = (d) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : out.push(relative(dir, join(d, n)))));
	walk(dir);
	return out.filter((f) => f !== "gozkulak.sig").sort();
};
const zip = (dir, name) => execFileSync("zip", ["-qr", name + ".zip", name], { cwd: dir });

// GitHub'ın arşivi gibi: klasör adı "gozkulak-X.Y.Z"
function pkg(tag, { version = tag, signWith = key, sigVersion = version, header = version, after } = {}) {
	const name = "gozkulak-" + tag;
	const dir = join(work, name);
	cpSync(base, dir, { recursive: true });
	const php = join(dir, "gozkulak.php");
	writeFileSync(php, readFileSync(php, "utf8").replace(/(\* Version:\s+)[0-9.]+/, "$1" + header).replace(/('GOZKULAK_VERSION', ')[^']+/, "$1" + version));
	if (signWith) {
		const manifest = "gozkulak " + sigVersion + "\n" + list(dir).map((f) => createHash("sha256").update(readFileSync(join(dir, f))).digest("hex") + " " + f + "\n").join("");
		const signature = sign(null, Buffer.from(manifest), signWith.privateKey).toString("base64");
		writeFileSync(join(dir, "gozkulak.sig"), JSON.stringify({ version: sigVersion, manifest, signature }));
	}
	if (after) after(dir);
	zip(work, name);
	return join(work, name + ".zip");
}
cpSync(base, join(work, "gozkulak"), { recursive: true });
zip(work, "gozkulak");
const ZIPS = {
	"v0.0.1": pkg("0.0.1"),
	"v9.9.0": pkg("9.9.0", { after: (d) => writeFileSync(join(d, "readme.txt"), readFileSync(join(d, "readme.txt"), "utf8") + "\nek satır\n") }),
	"v9.9.1": pkg("9.9.1", { signWith: null }),
	"v9.9.2": pkg("9.9.2", { signWith: other }),
	"v9.9.3": pkg("9.9.3", { after: (d) => writeFileSync(join(d, "includes", "arka-kapi.php"), "<?php\n") }),
	"v9.9.4": pkg("9.9.4", { header: "9.9.9" }),
	"v9.9.5": pkg("9.9.5"),
};
// Eski imzalı paket yeni bir etiketle yeniden sunulur (sürüm geriletme)
ZIPS["v9.9.9"] = pkg("9.9.9", { version: "9.9.0", sigVersion: "9.9.0", header: "9.9.0" });

// ---------- GitHub'ın yerine geçen sunucu ----------
let tags = [];
const src = createServer((req, res) => {
	const u = new globalThis.URL(req.url, SRC);
	if (u.pathname === "/tags") {
		res.writeHead(200, { "Content-Type": "application/json" });
		return res.end(JSON.stringify(tags.map((name) => ({ name }))));
	}
	const m = /^\/archive\/(v[0-9.]+)\.zip$/.exec(u.pathname);
	const file = u.pathname === "/base.zip" ? join(work, "gozkulak.zip") : m && ZIPS[m[1]];
	if (!file) {
		res.writeHead(404);
		return res.end();
	}
	res.writeHead(200, { "Content-Type": "application/zip" });
	res.end(readFileSync(file));
});
await new Promise((r) => src.listen(9402, "127.0.0.1", r));

// ---------- Playground ----------
const blueprint = join(work, "blueprint.json");
writeFileSync(blueprint, JSON.stringify({
	steps: [
		{ step: "defineWpConfigConsts", consts: { WP_ENVIRONMENT_TYPE: "local", GOZKULAK_TEST_PUBLIC_KEY: pub, GOZKULAK_TEST_UPDATE_SOURCE: SRC } },
		// Yalnızca bu deneme sitesinde: WordPress yerel adreslerden indirmeye izin versin
		// Yalnızca bu deneme sitesinde: yerel adreslerden indirme ve güncelleme listesini hemen yenileme (WordPress
		// eklentileri en çok dakikada bir denetler; senaryolar art arda çalışır).
		{ step: "writeFile", path: "/wordpress/wp-content/mu-plugins/gk-yerel.php", data: "<?php\nadd_filter( 'http_request_host_is_external', '__return_true' );\nadd_filter( 'http_allowed_safe_ports', function ( $p ) { $p[] = 9402; return $p; } );\nif ( isset( $_GET['gk-durum'] ) ) { add_action( 'init', function () { $u = get_site_transient( 'update_plugins' ); wp_send_json( array( 'liste' => $u && isset( $u->response ) ? array_map( function ( $x ) { return $x->new_version; }, $u->response ) : null, 'son' => $u && isset( $u->last_checked ) ? time() - $u->last_checked : null, 'onbellek' => get_site_transient( 'gozkulak_update' ), 'kilit' => get_option( 'core_updater.lock' ), 'sinif' => class_exists( 'GozKulak_Updater' ), 'kanca' => (bool) has_filter( 'pre_set_site_transient_update_plugins' ), 'duraklatilan' => function_exists( 'wp_paused_plugins' ) ? wp_paused_plugins()->get_all() : null, 'etkin' => get_option( 'active_plugins' ) ) ); } ); }\nif ( isset( $_GET['gk-yenile'] ) ) { add_action( 'init', function () { delete_site_transient( 'update_plugins' ); exit( 'tamam' ); } ); }\n" },
		{ step: "installPlugin", pluginData: { resource: "url", url: SRC + "base.zip" }, options: { activate: true } },
	],
}));
const server = spawn("npx", ["-y", "@wp-playground/cli@3.1.57", "server", "--php=7.4", "--port=9403", "--workers=1", "--blueprint=" + blueprint], { cwd: T, stdio: ["ignore", process.env.GK_LOG ? "inherit" : "ignore", process.env.GK_LOG ? "inherit" : "ignore"], detached: true });
let b;
try {
	for (let i = 0; ; i++) {
		try {
			if ((await fetch(WP + "/wp-login.php")).ok) break;
		} catch {}
		if (i > 120) throw new Error("Playground açılmadı");
		await new Promise((r) => setTimeout(r, 2000));
	}
	b = await chromium.launch();
	const p = await b.newPage();
	await p.goto(WP + "/wp-login.php");
	await p.fill("#user_login", "admin");
	await p.fill("#user_pass", "password");
	await p.click("#wp-submit");
	await p.waitForLoadState("networkidle");

	const row = () => p.locator('tr[data-plugin="gozkulak/gozkulak.php"]').first();
	const installed = async () => {
		await p.goto(WP + "/wp-admin/plugins.php");
		const text = await row().textContent();
		return { version: ((/(?:Version|Sürüm) ([0-9.]+)/.exec(text) || [])[1]) || "?", active: (" " + (await row().getAttribute("class")) + " ").includes(" active ") };
	};
	const offer = async (tag) => {
		tags = [tag, "v0.0.1"];
		await fetch(WP + "/?gk-yenile=1");
		await p.goto(WP + "/wp-admin/update-core.php?force-check=1");
		await p.goto(WP + "/wp-admin/plugins.php");
		if (process.env.GK_TANI) console.log("  durum " + tag + ":", await (await fetch(WP + "/?gk-durum=1")).text());
		return p.locator('a[href*="action=upgrade-plugin"][href*="gozkulak"]').first();
	};
	const update = async (tag) => {
		const link = await offer(tag);
		if (!(await link.count())) return "güncelleme önerilmedi";
		await p.goto(new globalThis.URL(await link.getAttribute("href"), WP + "/wp-admin/").href);
		await p.waitForLoadState("networkidle");
		return (await p.locator("#wpbody-content").textContent()).replace(/\s+/g, " ");
	};

	let s = await installed();
	check("başlangıç: kurulu sürüm " + current + ", etkin", s.version === current && s.active, JSON.stringify(s));
	tags = ["v0.0.1"];
	await fetch(WP + "/?gk-yenile=1");
	await p.goto(WP + "/wp-admin/update-core.php?force-check=1");
	await p.goto(WP + "/wp-admin/plugins.php");
	check("daha eski etikette güncelleme önerilmez", (await p.locator('a[href*="action=upgrade-plugin"][href*="gozkulak"]').count()) === 0);

	for (const [tag, why, re] of [
		["v9.9.0", "değiştirilmiş dosya", /değişmiş dosya: readme\.txt/],
		["v9.9.1", "imzasız paket", /imza dosyası yok/],
		["v9.9.2", "başka anahtarla imza", /imza tutmuyor/],
		["v9.9.3", "fazladan dosya", /listede olmayan dosya: includes\/arka-kapi\.php/],
		["v9.9.4", "başlıktaki sürüm imzadakiyle uyuşmuyor", /sürüm imzadakiyle uyuşmuyor/],
	]) {
		const out = await update(tag);
		s = await installed();
		check(why + ": kurulmaz, eski sürüm yerinde ve etkin", re.test(out) && s.version === current && s.active, (out.match(/GözKulak güncellemesi[^.]*\.[^.]*\./) || [out.slice(0, 160)])[0] + " | " + JSON.stringify(s));
	}

	let out = await update("v9.9.5");
	s = await installed();
	check("geçerli imzalı paket kurulur, eklenti etkin kalır", s.version === "9.9.5" && s.active, JSON.stringify(s) + " | " + out.slice(0, 200));
	const folder = await p.evaluate(async (u) => (await fetch(u)).status, WP + "/wp-content/plugins/gozkulak/gozkulak.php");
	const odd = await p.evaluate(async (u) => (await fetch(u)).status, WP + "/wp-content/plugins/gozkulak-9.9.5/gozkulak.php");
	check("klasör adı gozkulak kalır", folder !== 404 && odd === 404, folder + " / " + odd);
	const sigServed = await p.evaluate(async (u) => (await fetch(u)).status, WP + "/wp-content/plugins/gozkulak/gozkulak.sig");
	check("kurulan pakette imza dosyası var", sigServed === 200, String(sigServed));

	out = await update("v9.9.9");
	s = await installed();
	check("eski imzalı paket yeni etiketle sunulursa kurulmaz (geriletme)", /kurulu sürümden yeni değil/.test(out) && s.version === "9.9.5", JSON.stringify(s));
} finally {
	if (b) await b.close();
	try {
		process.kill(-server.pid);
	} catch {}
	src.close();
	rmSync(work, { recursive: true, force: true });
}
console.log("HATA SAYISI:", errs.length, errs.join(" | "));
process.exit(errs.length ? 1 : 0);

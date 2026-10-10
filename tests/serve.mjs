// GözKulak yerel test sunucusu (yalnızca geliştirme). PHP ya da WordPress gerektirmez.
//
//   node tests/serve.mjs            → http://127.0.0.1:8080
//
// Sunduğu adresler:
//   /wp-content/plugins/gozkulak/…  depo kökü (eklentinin kendisi)
//   /gk-mock/ /gk-oku/ /gk-tara/    tests/site/… altındaki deneme sayfaları (tema benzetimleri)
//   /gk-tts/page.php?w=&b=&fb=&mix= doğal ses deneme sayfası (eski PHP sayfasının karşılığı)
//   /gk-tts/worker-*.js             motor Worker'ı: sahte model özetleriyle, yedek kaynak alt/ olacak şekilde
//   /gk-tts/{,alt/}ema-lightning-onnx/13c431d/…  sahte modeller (tests/fixtures/ema-fake)
//   /gk-tts/{,alt/}onnxruntime-web/1.30.0/…      gerçek ONNX Runtime (tests/node_modules/onnxruntime-web/dist)
//   /gk-tts/bad/…                   bozuk kaynak (text.onnx aynı boyutta bozuk, ONNX Runtime yok)
//   /gk-tts/big/… /gk-tts/bigc/…    text.onnx beklenenden 3 MB büyük (Content-Length ile / parça parça)
//   /gk-tts/page.php?csp=…&files=…  aynı sayfa, güvenlik başlığıyla (CSP; Worker'a da aynısı) ve hazır ses listesiyle
//   /gk-hazir/xx/<özet>.ogg         hazır ses: her özet için aynı deneme sesi (tests/fixtures/hazir/ton.ogg)
//
// Deneme sayfalarındaki "version" alanı eklentinin güncel sürümüyle değiştirilir (eski betik uyarısı çıkmasın).
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const PORT = Number(process.env.GK_PORT) || 8080;
const HOST = process.env.GK_HOST || "127.0.0.1";
const ORIGIN = `http://127.0.0.1:${PORT}`;
const FAKE = join(T, "fixtures/ema-fake");
const ORT = join(T, "node_modules/onnxruntime-web/dist");
const MODEL_FILES = ["meta.json", "normalizer.wasm", "text.onnx", "sound.onnx", "decoder.onnx"];

// Güvenlik başlığı (CSP) denemeleri. "onerilen": eklentinin belgede önerilen en dar kuralı.
const CSP_BASE = "default-src 'self'; object-src 'none'; base-uri 'self'; img-src 'self' data:; style-src 'self'; connect-src 'self'; frame-src 'self'";
const CSP = {
	onerilen: CSP_BASE + "; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; media-src 'self' blob:",
	// Doğal sesin istediği izinler yok (WebAssembly ve blob: modülü): menü ve hazır ses çalışmalı
	katı: CSP_BASE + "; script-src 'self'; worker-src 'self'; media-src 'self' blob:",
	// Hazır ses blob: adresinden çalınamaz: doğal sese geçilmeli
	medyasız: CSP_BASE + "; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; media-src 'self'",
	// Trusted Types zorunlu: Worker adresi düz metinle verilemez
	tt: CSP_BASE + "; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; media-src 'self' blob:; require-trusted-types-for 'script'",
	// Trusted Types zorunlu ve politika adları sınırlı ("gozkulak" listede yok): tarayıcı sesi okumalı
	ttdar: CSP_BASE + "; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self'; media-src 'self' blob:; require-trusted-types-for 'script'; trusted-types baska",
};
const cspOf = (q) => (Object.hasOwn(CSP, q.get("csp") || "") ? CSP[q.get("csp")] : "");

const TYPES = {
	".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8", ".json": "application/json", ".wasm": "application/wasm", ".onnx": "application/octet-stream",
	".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain; charset=utf-8",
};

const version = () => (/define\(\s*'GOZKULAK_VERSION',\s*'([^']+)'/.exec(readFileSync(join(R, "gozkulak.php"), "utf8")) || [])[1] || "0";

// ---------- motor Worker'ının deneme kopyaları ----------
// Gerçek dosyadan üretilir: model dosyalarının özetleri sahte modellerinkiyle, yedek kaynak alt/ ile değişir.
function worker(kind) {
	let code = readFileSync(join(R, "assets/js/gozkulak-tts-worker.js"), "utf8");
	for (const name of MODEL_FILES) {
		const b = readFileSync(join(FAKE, name));
		const re = new RegExp('\\{ name: "' + name.replace(/\./g, "\\.") + '", size: \\d+, sha: "[0-9a-f]{64}" \\}');
		if (!re.test(code)) throw new Error("Worker'da " + name + " satırı bulunamadı");
		code = code.replace(re, `{ name: "${name}", size: ${b.length}, sha: "${createHash("sha256").update(b).digest("hex")}" }`);
	}
	const a = code.indexOf("const FALLBACK = {");
	const z = code.indexOf("};", a) + 2;
	const alt = ORIGIN + "/gk-tts/alt/";
	code = code.slice(0, a) + `const FALLBACK = { model: "${alt}ema-lightning-onnx/13c431d/", ort: "${alt}onnxruntime-web/1.30.0/" };` + code.slice(z);
	// Yavaş cihaz: her parça, sesinin süresinin şu katı kadar geç gelir
	const delay = { "worker-slow.js": 2, "worker-slow2.js": 1.25 }[kind];
	if (delay) code = code.replace("if (firstMs === null) firstMs", `await new Promise((r) => setTimeout(r, (wav.length / 48) * ${delay}));\n\t\t\t\tif (firstMs === null) firstMs`);
	// Gecikmeli motor: ikinci işten itibaren ilk parça 3,5 sn geç gelir (uzun bir cümlenin modelde
	// hesaplanması). Ses arada biter ama cihaz yavaş değildir.
	if (kind === "worker-lag.js") {
		code = code.replace("for await (const wav of ema.stream(", "if (id > 3) await new Promise((r) => setTimeout(r, 3500));\n\t\t\tfor await (const wav of ema.stream(");
		// Telefon gibi: üretim gerçek zamanın 2 katı hızında (her parça, süresinin yarısı kadar sürer)
		code = code.replace("if (firstMs === null) firstMs", "await new Promise((r) => setTimeout(r, (wav.length / 48) * 0.5));\n\t\t\t\tif (firstMs === null) firstMs");
	}
	// Takılan motor: ikinci işten sonra ilk parçadan sonra hiç yanıt vermez
	if (kind === "worker-hang.js") code = code.replace("await yieldNow();", "await yieldNow();\n\t\t\t\tif (id > 3) await new Promise(() => {});");
	return code;
}

// ---------- doğal ses deneme sayfası ----------
function ttsPage(q) {
	const workers = ["worker-test.js", "worker-slow.js", "worker-slow2.js", "worker-csp.php", "worker-hang.js", "worker-lag.js"];
	const w = workers.includes(q.get("w")) ? q.get("w") : "worker-test.js";
	const bases = { main: ORIGIN + "/gk-tts/", bad: ORIGIN + "/gk-tts/bad/", big: ORIGIN + "/gk-tts/big/", bigc: ORIGIN + "/gk-tts/bigc/", alt: ORIGIN + "/gk-tts/alt/", none: "", ngx: "http://127.0.0.1:8099/", broken: ORIGIN + "/gk-tts/nope/" };
	const b = bases[q.get("b") || "main"] ?? "";
	const cfg = {
		version: version(), testMode: true,
		css: "/wp-content/plugins/gozkulak/assets/css/menu.css?ver=t" + Date.now(), pageCss: "/wp-content/plugins/gozkulak/assets/css/page.css",
		position: "bottom-right", offset: [20, 20], size: 56, icon: "person", color: "#085e9d",
		features: ["font_size", "contrast", "dark_mode", "text_to_speech"],
		selector: "#main",
		tts: { worker: ORIGIN + "/gk-tts/" + w + (cspOf(q) ? "?csp=" + encodeURIComponent(q.get("csp")) : ""), base: b, fallback: q.get("fb") !== "0" },
	};
	const files = (q.get("files") || "").split(",").filter((x) => /^[0-9a-f]{32}$/.test(x));
	if (files.length) cfg.audio = { base: ORIGIN + "/gk-hazir/", files };
	const mix = q.get("mix") ? '<p lang="en">The house is open every day. Tickets are sold at the door.</p>\n' : "";
	const json = JSON.stringify(cfg).replace(/</g, "\\u003c");
	return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Doğal ses testi</title>
${cspOf(q) ? "" : "<style>body{font:16px/1.6 Arial,sans-serif;margin:0;color:#333} main{max-width:760px;margin:0 auto;padding:20px}</style>"}</head><body>
<main id="main"><h1>Kaymakamlar Gezi Evi</h1>
<p>Safranbolu Eski Çarşı'da bulunan Kaymakamlar Gezi Evi, geleneksel Safranbolu ev yaşamını tanıtmak amacıyla müzeye dönüştürülmüş tarihi bir konaktır. Yapı on dokuzuncu yüzyıl başlarında inşa edilmiştir.</p>
<p>Konakta odalar, mutfak ve günlük kullanım eşyaları sergilenir. Ziyaretçiler şehrin dokusunu yakından görür.</p>
${mix}<h2>Ziyaret</h2>
<p>Müze her gün açıktır. Bilet gişede satılır. Grup ziyaretleri için önceden haber verilmesi önerilir.</p>
</main>
<script type="application/json" id="gozkulak-config">${json}</script>
<script src="/wp-content/plugins/gozkulak/assets/js/gozkulak.js?ver=${Date.now()}" defer></script></body></html>`;
}

// ---------- dosya eşlemesi ----------
function resolveFile(path) {
	const safe = (base, rel) => {
		const p = normalize(join(base, rel));
		return p.startsWith(base + "/") || p === base ? p : null;
	};
	let m;
	if ((m = /^\/wp-content\/plugins\/gozkulak\/(.*)$/.exec(path))) return safe(R, m[1]);
	if ((m = /^\/gk-tts\/(?:alt\/)?ema-lightning-onnx\/13c431d\/([^/]+)$/.exec(path))) return safe(FAKE, m[1]);
	if ((m = /^\/gk-tts\/(?:alt\/|big\/|bigc\/)?onnxruntime-web\/1\.30\.0\/([^/]+)$/.exec(path))) return safe(ORT, m[1]);
	if ((m = /^\/(gk-mock|gk-oku|gk-tara)\/(.*)$/.exec(path))) {
		const p = safe(join(T, "site", m[1]), m[2] || "index.html");
		return p && existsSync(p) && statSync(p).isDirectory() ? join(p, "index.html") : p;
	}
	return null;
}

const server = createServer((req, res) => {
	const url = new globalThis.URL(req.url, ORIGIN);
	const path = decodeURIComponent(url.pathname);
	const send = (status, body, type, headers = {}) => {
		res.writeHead(status, Object.assign({ "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" }, headers));
		res.end(req.method === "HEAD" ? undefined : body);
	};
	try {
		const csp = cspOf(url.searchParams);
		const cspHeader = csp ? { "Content-Security-Policy": csp } : {};
		if (path === "/gk-tts/page.php") return send(200, ttsPage(url.searchParams), TYPES[".html"], cspHeader);
		if (/^\/gk-tts\/worker-(test|slow|slow2|hang|lag)\.js$/.test(path)) return send(200, worker(path.split("/").pop()), TYPES[".js"], cspHeader);
		if (/^\/gk-hazir\/[0-9a-f]{2}\/[0-9a-f]{32}\.ogg$/.test(path)) return send(200, readFileSync(join(T, "fixtures/hazir/ton.ogg")), "audio/ogg");
		// Katı güvenlik başlığıyla Worker: blob: modülü ve WebAssembly engellenir
		if (path === "/gk-tts/worker-csp.php") return send(200, worker("worker-test.js"), TYPES[".js"], { "Content-Security-Policy": "script-src 'self'" });
		// Bozuk kaynak: text.onnx bozuk, diğer model dosyaları sağlam, ONNX Runtime yok
		const bad = /^\/gk-tts\/bad\/ema-lightning-onnx\/13c431d\/([^/]+)$/.exec(path);
		if (bad && MODEL_FILES.includes(bad[1])) {
			let body = readFileSync(join(FAKE, bad[1]));
			if (bad[1] === "text.onnx") body = Buffer.concat([body.subarray(0, body.length - 5), Buffer.from("bozuk")]);
			return send(200, body, TYPES[extname(bad[1])], { "Access-Control-Allow-Origin": "*" });
		}
		// Beklenenden büyük dosya: indirme boyut sınırında kesilmeli (bellek dolmasın)
		const big = /^\/gk-tts\/(big|bigc)\/ema-lightning-onnx\/13c431d\/([^/]+)$/.exec(path);
		if (big && MODEL_FILES.includes(big[2])) {
			let body = readFileSync(join(FAKE, big[2]));
			if (big[2] === "text.onnx") body = Buffer.concat([body, Buffer.alloc(3 * 1024 * 1024)]);
			if (big[1] === "big") return send(200, body, TYPES[extname(big[2])], { "Access-Control-Allow-Origin": "*" });
			// Content-Length olmadan, parça parça
			res.writeHead(200, { "Content-Type": TYPES[extname(big[2])], "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "Transfer-Encoding": "chunked" });
			for (let i = 0; i < body.length; i += 65536) res.write(body.subarray(i, i + 65536));
			return res.end();
		}
		// Çerçeve içinde açılması yasak sayfa (tarama betiğinin yedek yolu için)
		if (path === "/gk-tara/c.php" || path === "/gk-tara/c.html") {
			return send(200, readFileSync(join(T, "site/gk-tara/c.html")), TYPES[".html"], { "X-Frame-Options": "DENY" });
		}
		const file = resolveFile(path);
		if (!file || !existsSync(file) || !statSync(file).isFile()) return send(404, "yok");
		let body = readFileSync(file);
		const type = TYPES[extname(file)] || "application/octet-stream";
		if (extname(file) === ".html" && /\/gk-(mock|oku|tara)\//.test(path)) {
			body = body.toString("utf8").replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version()}"`);
		}
		return send(200, body, type, { "Access-Control-Allow-Origin": "*" });
	} catch (e) {
		return send(500, String(e && e.message));
	}
});

server.listen(PORT, HOST, () => {
	if (!existsSync(ORT)) console.warn("Uyarı: tests/node_modules/onnxruntime-web yok; önce tests klasöründe npm install çalıştırın.");
	console.log(`GözKulak test sunucusu: ${ORIGIN}`);
});

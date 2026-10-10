// Başarım karşılaştırması: aynı deneme sayfası (Listeo benzetimi, sesli okuma açık) eklentili ve eklentisiz,
// Lighthouse ile mobil ve masaüstünde üçer kez ölçülür; ortanca değerler tablo olarak yazılır.
//   cd tests && npm run lighthouse      (test sunucusu kapalıysa kendisi açar; Lighthouse npx ile iner)
//
// Lighthouse'un benzetimli ağ yavaşlatması (PageSpeed Insights da bunu kullanır) LCP'den önce keşfedilen her
// dosyayı hesaba katar; gerçek yavaşlatmayla ölçüm için GK_LH_DEVTOOLS=1.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const BASE = "http://127.0.0.1:8080";
const up = () => fetch(BASE + "/gk-mock/").then((r) => r.ok, () => false);
let server = null;
if (!(await up())) {
	server = spawn(process.execPath, [T + "/serve.mjs"], { cwd: T, stdio: "ignore" });
	for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
}
const out = mkdtempSync(join(tmpdir(), "gk-lh-"));
const env = Object.assign({}, process.env, { CHROME_PATH: chromium.executablePath() });
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
try {
	for (const form of ["mobile", "desktop"]) {
		const row = {};
		for (const gk of [0, 1]) {
			const rs = [];
			for (let i = 0; i < 3; i++) {
				const file = join(out, `${form}-${gk}-${i}.json`);
				const args = ["-y", "lighthouse@12.6.0", `${BASE}/gk-mock/listeo.html?tts=1&gk=${gk}&r=${i}`, "--quiet", "--chrome-flags=--headless=new --no-sandbox",
					"--only-categories=performance,accessibility,best-practices", "--output=json", "--output-path=" + file];
				if (form === "desktop") args.push("--preset=desktop");
				if (process.env.GK_LH_DEVTOOLS) args.push("--throttling-method=devtools");
				execFileSync("npx", args, { env, stdio: "ignore" });
				rs.push(JSON.parse(readFileSync(file, "utf8")));
			}
			const a = (id) => med(rs.map((r) => r.audits[id].numericValue));
			row[gk ? "eklentili" : "eklentisiz"] = {
				başarım: med(rs.map((r) => Math.round(r.categories.performance.score * 100))),
				"FCP ms": Math.round(a("first-contentful-paint")),
				"LCP ms": Math.round(a("largest-contentful-paint")),
				"TBT ms": Math.round(a("total-blocking-time")),
				CLS: +a("cumulative-layout-shift").toFixed(3),
				"aktarım KB": Math.round(a("total-byte-weight") / 1024),
			};
		}
		console.log("\n" + form);
		console.table(row);
	}
} finally {
	rmSync(out, { recursive: true, force: true });
	if (server) server.kill();
}

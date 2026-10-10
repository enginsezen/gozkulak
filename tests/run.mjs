// GözKulak testlerini sırayla çalıştırır. Test sunucusu (serve.mjs) çalışmıyorsa kendisi açar.
//
//   cd tests && npm install && npx playwright install chromium   (ilk kez)
//   npm test            → temel testler (WordPress gerekmez)
//   npm run test:all    → ek olarak başarım ve ekran görüntüsü testleri
//
// WordPress isteyen testler (admin-*.mjs, ema2.mjs, tara-wp.mjs, wp12*.mjs) burada çalıştırılmaz;
// yerel bir WordPress (http://localhost:8080, yönetici admin/admin) ile elle çalıştırılır.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const BASE = "http://127.0.0.1:8080";
mkdirSync(T + "/shots", { recursive: true });

const CORE = [
	["speechtext.mjs"],
	["mock.mjs"],
	["toggle.mjs"],
	["v023.mjs"],
	["contrast2.mjs"],
	["heading.mjs"],
	["late.mjs"],
	["listeo.mjs"],
	["kbd.mjs", BASE + "/gk-tara/menu.html"],
	["mobile.mjs"],
	["tara-mock.mjs"],
	["reader.mjs"],
	["hours.mjs"],
	["tocsel.mjs"],
	["group.mjs"],
	["ema.mjs"],
	["ema3.mjs"],
	["ema4.mjs"],
	["ema5.mjs"],
	["ema-limit.mjs"],
	["ema-csp.mjs"],
];
const EXTRA = [["perf.mjs"], ["ema-shots.mjs"]];
const list = process.argv.includes("--all") ? CORE.concat(EXTRA) : CORE;

async function up() {
	try {
		const r = await fetch(BASE + "/gk-mock/");
		return r.ok;
	} catch (e) {
		return false;
	}
}

function run(file, args) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [T + "/e2e/" + file, ...args], { cwd: T, stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		child.stdout.on("data", (d) => (out += d));
		child.stderr.on("data", (d) => (out += d));
		const timer = setTimeout(() => child.kill("SIGKILL"), 6 * 60 * 1000);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code, out });
		});
	});
}

let server = null;
if (!(await up())) {
	server = spawn(process.execPath, [T + "/serve.mjs"], { cwd: T, stdio: "ignore" });
	for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
}

const failed = [];
for (const [file, ...args] of list) {
	const t0 = Date.now();
	const { code, out } = await run(file, args);
	const bad =
		code !== 0 ||
		(/HATALAR:/.test(out) && !/HATALAR: yok/.test(out)) ||
		(/HATA SAYISI:/.test(out) && !/HATA SAYISI: 0\b/.test(out));
	console.log((bad ? "✗ " : "✓ ") + file.padEnd(16) + Math.round((Date.now() - t0) / 1000) + " sn");
	if (bad) {
		failed.push(file);
		console.log(out.split("\n").slice(-25).map((l) => "    " + l).join("\n"));
	}
}
if (server) server.kill();
console.log(failed.length ? "\nBAŞARISIZ: " + failed.join(", ") : "\nTüm testler geçti.");
process.exit(failed.length ? 1 : 0);

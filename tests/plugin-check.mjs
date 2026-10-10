// WordPress Plugin Check: eklentinin dağıtılan paketi (git archive; tools/ ve tests/ yok) Playground'da denetlenir.
//   cd tests && npm run plugin-check     → bulgular listelenir; "HATA" satırı yoksa sorun yok
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const D = T + "/.plugin-check";
const PORT = 9401;
const WP = "http://127.0.0.1:" + PORT;

// Çalışma kopyasındaki dosyalar paketlenir (commit edilmemiş değişiklikler dahil).
rmSync(D, { recursive: true, force: true });
mkdirSync(D, { recursive: true });
const tree = execFileSync("git", ["stash", "create"], { cwd: R }).toString().trim() || "HEAD";
execFileSync("sh", ["-c", `git archive --prefix=gozkulak/ ${tree} | tar -x -C "${D}"`], { cwd: R });

const server = spawn("npx", ["-y", "@wp-playground/cli@3.1.57", "server", "--php=7.4", "--port=" + PORT, "--workers=1",
	"--mount=" + D + "/gozkulak:/wordpress/wp-content/plugins/gozkulak", "--blueprint=wp/plugin-check.json"], { cwd: T, stdio: "ignore", detached: true });
const stop = () => {
	try {
		process.kill(-server.pid);
	} catch {}
};
let code = 0;
try {
	for (let i = 0; ; i++) {
		try {
			if ((await fetch(WP + "/wp-login.php")).ok) break;
		} catch {}
		if (i > 120) throw new Error("Playground açılmadı");
		await new Promise((r) => setTimeout(r, 2000));
	}
	const b = await chromium.launch();
	const p = await b.newPage();
	await p.goto(WP + "/wp-login.php");
	await p.fill("#user_login", "admin");
	await p.fill("#user_pass", "password");
	await p.click("#wp-submit");
	await p.waitForLoadState("networkidle");
	await p.goto(WP + "/wp-admin/tools.php?page=plugin-check");
	await p.selectOption("#plugin-check__plugins-dropdown", "gozkulak/gozkulak.php");
	await p.click("#plugin-check__submit");
	await p.waitForFunction(() => {
		const el = document.querySelector("#plugin-check__results");
		return el && /Checks complete|No errors found|kontrol/i.test(el.textContent + (document.querySelector(".notice") || { textContent: "" }).textContent);
	}, null, { timeout: 600000 }).catch(() => {});
	await p.waitForTimeout(3000);
	const rows = await p.evaluate(() => [...document.querySelectorAll("#plugin-check__results h4, #plugin-check__results tr")].map((r) => r.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
	const notes = await p.evaluate(() => [...document.querySelectorAll("#plugin-check__results p, .notice")].map((r) => r.textContent.replace(/\s+/g, " ").trim()).filter(Boolean));
	console.log(rows.join("\n") || "(tablo yok)");
	console.log("--\n" + notes.join("\n"));
	if (rows.some((r) => /\bERROR\b/.test(r))) code = 1;
	await b.close();
} finally {
	stop();
}
process.exit(code);

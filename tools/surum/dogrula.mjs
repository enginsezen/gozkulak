// Etiket gönderildikten sonra: GitHub'ın etiket arşivini indirir ve eklentinin kurulumdan önce yaptığı
// denetimin aynısını yapar (imza, dosya listesi, sürüm). Sitelere güncelleme gitmeden önce çalıştırılır.
//
//   node tools/surum/dogrula.mjs 0.4.0
import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, verify } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const R = fileURLToPath(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, "");
const version = process.argv[2] || "";
if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
	console.error("Kullanım: node tools/surum/dogrula.mjs X.Y.Z");
	process.exit(2);
}
const fail = (m) => {
	console.error("✗ " + m);
	process.exit(1);
};
const pubB64 = (/const PUBLIC_KEY = '([A-Za-z0-9+/=]+)';/.exec(readFileSync(join(R, "includes/class-gozkulak-updater.php"), "utf8")) || [])[1];
const pub = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(pubB64, "base64").toString("base64url") }, format: "jwk" });

// İndirilen arşiv güvenilmeyen veridir: ayrı, boş bir klasöre açılır; içinden hiçbir şey çalıştırılmaz.
const dir = mkdtempSync(join(tmpdir(), "gk-dogrula-"));
try {
	const url = "https://github.com/enginsezen/gozkulak/archive/refs/tags/v" + version + ".zip";
	execFileSync("curl", ["-sfL", "-o", join(dir, "paket.zip"), url]);
	execFileSync("unzip", ["-q", join(dir, "paket.zip"), "-d", join(dir, "acik")]);
	const top = readdirSync(join(dir, "acik"));
	if (top.length !== 1) fail("arşivde tek klasör bekleniyordu: " + top.join(", "));
	const pkg = join(dir, "acik", top[0]);
	const sig = JSON.parse(readFileSync(join(pkg, "gozkulak.sig"), "utf8"));
	if (!verify(null, Buffer.from(sig.manifest, "utf8"), pub, Buffer.from(sig.signature, "base64"))) fail("imza tutmuyor");
	const lines = sig.manifest.replace(/\n$/, "").split("\n");
	if (lines.shift() !== "gozkulak " + version || sig.version !== version) fail("imzadaki sürüm " + sig.version);
	const want = new Map(lines.map((l) => [l.slice(65), l.slice(0, 64)]));
	const have = [];
	const walk = (d) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : have.push(relative(pkg, join(d, n)))));
	walk(pkg);
	const files = have.filter((f) => f !== "gozkulak.sig");
	const extra = files.filter((f) => !want.has(f));
	const missing = [...want.keys()].filter((f) => !files.includes(f));
	if (extra.length) fail("listede olmayan dosya: " + extra.join(", "));
	if (missing.length) fail("eksik dosya: " + missing.join(", "));
	for (const f of files) if (createHash("sha256").update(readFileSync(join(pkg, f))).digest("hex") !== want.get(f)) fail("değişmiş dosya: " + f);
	const header = (/^\s*\*\s*Version:\s*([0-9.]+)\s*$/m.exec(readFileSync(join(pkg, "gozkulak.php"), "utf8")) || [])[1];
	if (header !== version) fail("eklenti başlığındaki sürüm " + header);
	console.log("✓ GitHub arşivi v" + version + ": imza geçerli, " + files.length + " dosya birebir aynı, sürüm doğru.");
} finally {
	rmSync(dir, { recursive: true, force: true });
}

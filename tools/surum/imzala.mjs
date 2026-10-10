// Sürüm imzalama: paketin (git archive HEAD; tools/ ve tests/ yok) her dosyasının SHA-256 özetini bir listeye
// yazar, listeyi Ed25519 gizli anahtarıyla imzalar ve depo köküne gozkulak.sig olarak koyar.
// Sitedeki eklenti, GitHub'dan inen güncellemeyi kurmadan önce bu imzayı gömülü açık anahtarla doğrular.
//
//   node tools/surum/imzala.mjs          (sürüm commit'inden sonra, çalışma kopyası temizken)
//   git add gozkulak.sig && git commit -m "X.Y.Z imzası" && git tag vX.Y.Z && git push origin main --tags
//
// Gizli anahtar: ~/.config/gozkulak/imza-anahtari.pem (ya da GOZKULAK_IMZA). Repoya girmez; yedeklenmelidir.
// Anahtar kaybolursa imzalı güncelleme çıkarılamaz: yeni anahtarla bir sürüm sitelere elle kurulmalıdır.
import { execFileSync } from "node:child_process";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const R = fileURLToPath(new globalThis.URL("../..", import.meta.url)).replace(/\/$/, "");
const git = (...a) => execFileSync("git", a, { cwd: R }).toString();
const fail = (m) => {
	console.error("HATA: " + m);
	process.exit(1);
};

if (git("status", "--porcelain", "--untracked-files=no").trim()) fail("çalışma kopyasında commit edilmemiş değişiklik var");
const php = readFileSync(join(R, "gozkulak.php"), "utf8");
const version = (/define\(\s*'GOZKULAK_VERSION',\s*'([0-9]+\.[0-9]+\.[0-9]+)'\s*\)/.exec(php) || [])[1];
const header = (/^\s*\*\s*Version:\s*([0-9.]+)\s*$/m.exec(php) || [])[1];
if (!version || version !== header) fail("gozkulak.php sürümü okunamadı ya da başlıkla uyuşmuyor");

const keyFile = process.env.GOZKULAK_IMZA || join(homedir(), ".config/gozkulak/imza-anahtari.pem");
const key = createPrivateKey(readFileSync(keyFile));
const pub = Buffer.from(createPublicKey(key).export({ format: "jwk" }).x, "base64url").toString("base64");
const embedded = (/const PUBLIC_KEY = '([A-Za-z0-9+/=]+)';/.exec(readFileSync(join(R, "includes/class-gozkulak-updater.php"), "utf8")) || [])[1];
if (pub !== embedded) fail("gizli anahtar, eklentiye gömülü açık anahtarla eşleşmiyor");

// Paketin içeriği: GitHub'ın arşivi de .gitattributes'taki export-ignore kurallarına uyar.
const dir = mkdtempSync(join(tmpdir(), "gk-imza-"));
try {
	execFileSync("sh", ["-c", `git archive HEAD | tar -x -C "${dir}"`], { cwd: R });
	const files = [];
	const walk = (d) => {
		for (const n of readdirSync(d)) {
			const p = join(d, n);
			if (statSync(p).isDirectory()) walk(p);
			else files.push(relative(dir, p));
		}
	};
	walk(dir);
	const list = files.filter((f) => f !== "gozkulak.sig").sort();
	if (list.some((f) => !/^[A-Za-z0-9._/-]+$/.test(f))) fail("dosya adlarında yalnızca ASCII harf, rakam, . _ - / olmalı");
	const manifest = "gozkulak " + version + "\n" + list.map((f) => createHash("sha256").update(readFileSync(join(dir, f))).digest("hex") + " " + f + "\n").join("");
	const signature = sign(null, Buffer.from(manifest, "utf8"), key).toString("base64");
	writeFileSync(join(R, "gozkulak.sig"), JSON.stringify({ version, manifest, signature }, null, "\t") + "\n");
	console.log("gozkulak.sig yazıldı: sürüm " + version + ", " + list.length + " dosya.");
	console.log("Sıradaki: git add gozkulak.sig && git commit -m \"" + version + " imzası\" && git tag v" + version + " && git push origin main --tags");
} finally {
	rmSync(dir, { recursive: true, force: true });
}

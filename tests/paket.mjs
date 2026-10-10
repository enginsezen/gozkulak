// Çalışma kopyasından eklenti paketi: izlenen ve henüz commit edilmemiş yeni dosyalar (yok sayılanlar hariç),
// .gitattributes'taki export-ignore kurallarına göre süzülür (git archive ve GitHub arşiviyle aynı içerik).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");

export function packageInto(dest) {
	const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: R }).toString().split("\0").filter(Boolean);
	// Kural bir klasöre konduysa ("/tests export-ignore") git archive klasörü bütünüyle atlar: üst klasörler de denetlenir.
	const paths = new Set();
	for (const f of files) {
		const parts = f.split("/");
		for (let i = 1; i <= parts.length; i++) paths.add(parts.slice(0, i).join("/"));
	}
	const attrs = execFileSync("git", ["check-attr", "-z", "export-ignore", "--stdin"], { cwd: R, input: [...paths].join("\0") + "\0" }).toString().split("\0");
	const ignored = new Set();
	for (let i = 0; i + 2 < attrs.length; i += 3) if (attrs[i + 2] === "set") ignored.add(attrs[i]);
	const out = [];
	for (const f of files) {
		const parts = f.split("/");
		if (parts.some((_, i) => ignored.has(parts.slice(0, i + 1).join("/")))) continue;
		try {
			mkdirSync(dirname(join(dest, f)), { recursive: true });
			copyFileSync(join(R, f), join(dest, f));
			out.push(f);
		} catch (e) {
			// Silinmiş ama henüz commit edilmemiş dosya: pakete girmez.
		}
	}
	return out;
}

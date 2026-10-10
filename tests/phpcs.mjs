// PHPCS (WordPress kodlama standardı), sisteme PHP kurmadan: PHP WebAssembly ile (@php-wasm/cli).
// İlk çalıştırmada Composer ve WPCS tests/.phpcs/ altına kurulur (repoya girmez).
//   cd tests && npm run phpcs        → çıktı boşsa sorun yok
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const R = fileURLToPath(new globalThis.URL("..", import.meta.url)).replace(/\/$/, "");
const D = T + "/.phpcs";
const V = D + "/vendor";
const php = (args, cwd) => execFileSync("npx", ["-y", "@php-wasm/cli@3.1.57", ...args], { cwd, stdio: ["ignore", "inherit", "inherit"] });

if (!existsSync(V + "/bin/phpcs")) {
	mkdirSync(D, { recursive: true });
	writeFileSync(D + "/composer.json", JSON.stringify({
		"require-dev": { "wp-coding-standards/wpcs": "^3.0" },
		config: { "allow-plugins": { "dealerdirect/phpcodesniffer-composer-installer": true } },
	}));
	execFileSync("curl", ["-sSLo", D + "/composer.phar", "https://getcomposer.org/download/latest-stable/composer.phar"], { stdio: "inherit" });
	php(["composer.phar", "install", "--no-interaction", "--no-progress", "--quiet"], D);
}

const paths = ["phpcsstandards/phpcsextra", "phpcsstandards/phpcsutils", "wp-coding-standards/wpcs"].map((p) => V + "/" + p).join(",");
try {
	php([V + "/squizlabs/php_codesniffer/bin/phpcs", "-q", "--runtime-set", "installed_paths", paths, "--standard=phpcs.xml.dist", "."], R);
} catch {
	process.exit(1);
}

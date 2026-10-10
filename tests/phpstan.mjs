// PHPStan (WordPress uzantısıyla), sisteme PHP kurmadan: PHP WebAssembly ile (@php-wasm/cli).
// İlk çalıştırmada Composer, PHPStan ve WordPress uzantısı tests/.phpstan/ altına kurulur (repoya girmez).
//   cd tests && npm run phpstan      → "No errors" görünmeli
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const T = fileURLToPath(new globalThis.URL(".", import.meta.url)).replace(/\/$/, "");
const D = T + "/.phpstan";
const V = D + "/vendor";
const php = (args, cwd) => execFileSync("npx", ["-y", "@php-wasm/cli@3.1.57", ...args], { cwd, stdio: ["ignore", "inherit", "inherit"] });

if (!existsSync(V + "/bin/phpstan")) {
	mkdirSync(D, { recursive: true });
	writeFileSync(D + "/composer.json", JSON.stringify({
		"require-dev": { "phpstan/phpstan": "^2.1", "szepeviktor/phpstan-wordpress": "^2.0", "phpstan/extension-installer": "^1.4" },
		config: { "allow-plugins": { "phpstan/extension-installer": true } },
	}));
	execFileSync("curl", ["-sSLo", D + "/composer.phar", "https://getcomposer.org/download/latest-stable/composer.phar"], { stdio: "inherit" });
	php(["composer.phar", "install", "--no-interaction", "--no-progress", "--quiet"], D);
}

try {
	php([V + "/phpstan/phpstan/phpstan.phar", "analyse", "--no-progress", "--memory-limit=1G", "-c", "phpstan.neon.dist"], T);
} catch {
	process.exit(1);
}

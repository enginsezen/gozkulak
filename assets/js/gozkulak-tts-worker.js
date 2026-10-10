/*!
 * GözKulak — doğal ses motoru (Web Worker).
 *
 * Türkçe sesi EMA Lightning modeliyle ziyaretçinin tarayıcısında üretir; okunan metin cihazdan çıkmaz.
 * Menü betiği (gozkulak.js) bu dosyayı yalnızca ziyaretçi doğal sesle dinlemek istediğinde açar.
 *
 * Motor dosyaları sürüme sabitlenmiştir ve her biri SHA-256 ile doğrulanır. Doğrulaması tutmayan
 * dosyayla motor çalışmaz; dosya bir sonraki kaynaktan istenir. Doğrulanan dosyalar tarayıcının
 * önbelleğinde (Cache Storage) saklanır ve sonraki okumalarda yeniden indirilmez.
 *
 * EMA bölümü, ozcancelik/ema-lightning-onnx deposundaki web/tts.js ve web/normalizer.js
 * dosyalarından uyarlanmıştır (Apache License 2.0, commit 13c431db0356b2f7fafb1247cd823ec0d777c820).
 * Model: canberkkkkkk/ema-lightning (Apache License 2.0). Metin normalleştirme: normalizer-tr,
 * Erdem Tuna (Apache License 2.0). ONNX Runtime Web: Microsoft (MIT). Ayrıntılar: THIRD-PARTY-NOTICES.txt
 *
 * Uyarlamada yapılan değişiklikler: dosya indirme ve doğrulama, Worker mesajları, ilk parçada kademeli
 * büyüyen çözme pencereleri (1 → 2 → 4 sn), ısınma çalıştırması, iptal.
 */
(() => {
	"use strict";

	// ---------- sabitlenmiş dosyalar ----------

	const EMA_DIR = "ema-lightning-onnx/13c431d/";
	const ORT_DIR = "onnxruntime-web/1.30.0/";
	// Kendi sunucu adresi verilmezse ya da oradan alınamazsa kullanılan kaynaklar (sürüme sabitli)
	const FALLBACK = {
		model: "https://huggingface.co/ozcancelik/ema-lightning-onnx/resolve/13c431db0356b2f7fafb1247cd823ec0d777c820/",
		ort: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/",
	};

	const ORT_FILES = {
		wasm: [
			{ name: "ort.wasm.min.mjs", size: 50126, sha: "219e6a1fc8a9938268d18efca3c91d310bd2f4a59bbd13744df5b2b7fc6cee3b" },
			{ name: "ort-wasm-simd-threaded.mjs", size: 24381, sha: "e13f7f94fc51b4ca72b12faeb1ee95f4ace6dfbc8939bc718aabdc0a27c4299b" },
			{ name: "ort-wasm-simd-threaded.wasm", size: 14239897, sha: "3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2" },
		],
		webgpu: [
			{ name: "ort.webgpu.min.mjs", size: 66349, sha: "3dffff71811bc13a3a3d9591c57ca5ee5735b8f5f3eaf789510b02bb040ae3a0" },
			{ name: "ort-wasm-simd-threaded.asyncify.mjs", size: 53057, sha: "3d1c85995364bb643302fc6fd877a0c3ba5ae72401815e0f24828a53d9191e28" },
			{ name: "ort-wasm-simd-threaded.asyncify.wasm", size: 26781914, sha: "39f9f0894d478800487ed9f7dbe92618498db320cf55c8e3d89adff8dce658da" },
		],
	};
	const EMA_FILES = [
		{ name: "meta.json", size: 357, sha: "76627201405723633f5319a208ed7dea63c42acbf3ca997671bccdca9d9186b2" },
		{ name: "normalizer.wasm", size: 1211738, sha: "2614bcf15b4546249d49474c029420a4a611daf9e9a0c596cc852bd16cdecc89" },
		{ name: "text.onnx", size: 4806400, sha: "ad5d4885b5d218f63d976a6e562334ea0194aec54847a6c6482d328e784089f0" },
		{ name: "sound.onnx", size: 18120655, sha: "958364217360cecaa92dc5ff2170d19f3c9f6995fd5e61241ea4068971a46a59" },
		{ name: "decoder.onnx", size: 12031945, sha: "396c06a8e5711fd40bfd2c3f4f33851feb2ad07a86485833844e0ae8ff637b17" },
	];

	// ---------- mesajlar ----------

	const post = (m, transfer) => self.postMessage(m, transfer || []);

	// Komutlar sırayla çalışır (model oturumları aynı anda iki işi kaldırmaz). "cancel" hemen işlenir:
	// o ana kadar gönderilmiş ses üretme işleri bırakılır.
	let chain = Promise.resolve();
	let cancelUpTo = 0;
	self.onmessage = (e) => {
		const msg = e.data;
		if (!msg || typeof msg !== "object") return;
		if (msg.cmd === "cancel") {
			cancelUpTo = Math.max(cancelUpTo, Number(msg.upTo) || 0);
			return;
		}
		chain = chain.then(() => run(msg));
	};

	async function run(msg) {
		const id = Number(msg.id) || 0;
		try {
			let data;
			if (msg.cmd === "probe") data = await probe(msg);
			else if (msg.cmd === "load") data = await load(msg, id);
			else if (msg.cmd === "synth") data = await synth(msg, id);
			else throw new Error("Bilinmeyen komut");
			post({ ev: "result", id, data });
		} catch (err) {
			post({ ev: "error", id, message: errText(err), code: (err && err.code) || "" });
		}
	}

	function errText(e) {
		if (e === undefined || e === null) return "Bilinmeyen hata";
		if (typeof e === "string") return e;
		if (typeof e === "number") return "ONNX Runtime hata kodu " + e;
		return e.message || String(e);
	}

	function fail(text, code) {
		const err = new Error(text);
		err.code = code;
		return err;
	}

	// Olay döngüsüne kısa bir nefes: bu arada gelen "cancel" mesajı işlenebilsin.
	const chan = new MessageChannel();
	const waiters = [];
	chan.port1.onmessage = () => {
		const r = waiters.shift();
		if (r) r();
	};
	const yieldNow = () => new Promise((r) => {
		waiters.push(r);
		chan.port2.postMessage(0);
	});

	// ---------- kaynaklar ve doğrulanmış dosya indirme ----------

	// Önce sitenin kendi ses sunucusu, sonra (yönetici kapatmadıysa) sabitlenmiş yedek kaynaklar.
	// Kendi sunucu adresi yoksa yedek kaynaklar her zaman kullanılır.
	function sources(base, fallback) {
		const list = [];
		if (typeof base === "string" && /^https?:\/\/[^/?#]+\/([^?#]*\/)?$/.test(base)) {
			list.push({ model: base + EMA_DIR, ort: base + ORT_DIR });
		}
		if (!list.length || fallback !== false) list.push(FALLBACK);
		return list;
	}

	const CACHE = "gozkulak-tts-v1";
	const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
	// Önbellek anahtarı dosyanın özetidir: dosyalar başka bir sunucuya taşınsa da yeniden indirilmez.
	const cacheKey = (f) => self.location.origin + "/gozkulak-tts/" + f.sha + "/" + f.name.replace(/[^\w.-]/g, "_");

	let cachePromise = null;
	function openCache() {
		if (!cachePromise) {
			cachePromise = (async () => {
				try {
					return self.caches ? await self.caches.open(CACHE) : null;
				} catch (e) {
					return null;
				}
			})();
		}
		return cachePromise;
	}

	async function fromCache(f) {
		const cache = await openCache();
		if (!cache) return null;
		try {
			const hit = await cache.match(cacheKey(f));
			return hit ? await hit.arrayBuffer() : null;
		} catch (e) {
			return null;
		}
	}

	// Bağlantı bu süre boyunca hiç veri getirmezse indirme kesilir ve sıradaki kaynak denenir.
	const STALL_MS = 30000;

	async function download(url, onBytes, store) {
		const ctl = typeof AbortController === "function" ? new AbortController() : null;
		let timer = 0;
		const arm = () => {
			if (!ctl) return;
			clearTimeout(timer);
			timer = setTimeout(() => ctl.abort(), STALL_MS);
		};
		arm();
		try {
			// Kimlik bilgisi ve sayfa adresi (Referer) gönderilmez.
			const res = await fetch(url, {
				credentials: "omit",
				// Dosya önbelleğe (Cache Storage) yazılacaksa tarayıcının HTTP önbelleğinde ikinci kopyası tutulmaz.
				cache: store ? "no-store" : "default",
				redirect: "follow",
				referrerPolicy: "no-referrer",
				signal: ctl ? ctl.signal : undefined,
			});
			if (!res.ok) throw new Error("HTTP " + res.status);
			if (!res.body || !res.body.getReader) {
				const buf = await res.arrayBuffer();
				onBytes(buf.byteLength);
				return buf;
			}
			const reader = res.body.getReader();
			const parts = [];
			let n = 0;
			for (;;) {
				arm();
				const { done, value } = await reader.read();
				if (done) break;
				parts.push(value);
				n += value.byteLength;
				onBytes(value.byteLength);
			}
			return join(parts, n);
		} catch (e) {
			throw ctl && ctl.signal.aborted ? new Error("bağlantı " + STALL_MS / 1000 + " sn yanıt vermedi") : e;
		} finally {
			clearTimeout(timer);
		}
	}

	function join(parts, n) {
		const u8 = new Uint8Array(n);
		let o = 0;
		for (const p of parts) {
			u8.set(p, o);
			o += p.byteLength;
		}
		return u8.buffer;
	}

	const sha256 = async (buf) => hex(await self.crypto.subtle.digest("SHA-256", buf));

	// Dosyayı önbellekten ya da sırayla kaynaklardan alır; özeti tutmayan dosya kullanılmaz.
	// net false ise ağdan hiçbir şey indirilmez (ziyaretçi bu sayfada indirmeyi onaylamadı).
	async function getFile(f, urls, acct, net) {
		const cached = await fromCache(f);
		if (cached && (await sha256(cached)) === f.sha) {
			acct(f.size);
			return { buf: cached, net: false };
		}
		const cache = await openCache();
		if (cached && cache) await cache.delete(cacheKey(f)).catch(() => {});
		if (!net) throw fail(f.name + " önbellekte yok", "consent");
		const problems = [];
		for (const url of urls) {
			let counted = 0;
			try {
				const buf = await download(url, (n) => {
					counted += n;
					acct(n);
				}, !!cache);
				const got = await sha256(buf);
				if (got !== f.sha) throw new Error("SHA-256 doğrulaması tutmadı (gelen " + got.slice(0, 12) + "…)");
				if (cache) {
					await cache.put(cacheKey(f), new Response(buf, { headers: { "content-type": "application/octet-stream" } })).catch(() => {});
				}
				acct(f.size - counted);
				return { buf, net: true };
			} catch (e) {
				acct(-counted);
				problems.push(new URL(url).host + ": " + errText(e));
			}
		}
		throw fail(f.name + " alınamadı (" + problems.join("; ") + ")", "files");
	}

	// ---------- yoklama: dosyalar önbellekte mi, motor bu tarayıcıda çalışabilir mi ----------

	async function present(f) {
		const cache = await openCache();
		if (!cache) return false;
		try {
			return !!(await cache.match(cacheKey(f)));
		} catch (e) {
			return false;
		}
	}

	// Motorun ihtiyaç duyduğu tarayıcı yetenekleri. Sayfanın güvenlik başlığı (CSP) blob: modülünü ya da
	// WebAssembly'yi engelliyorsa bu, indirmeden önce anlaşılır.
	let support = null;
	function supported() {
		if (!support) {
			support = (async () => {
				if (typeof WebAssembly !== "object") return "WebAssembly yok";
				if (!(self.crypto && self.crypto.subtle)) return "crypto.subtle yok (sayfa HTTPS üzerinden açılmalı)";
				try {
					await WebAssembly.instantiate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
				} catch (e) {
					return "WebAssembly çalıştırılamıyor (güvenlik başlığı?): " + errText(e);
				}
				const url = URL.createObjectURL(new Blob(["export default 1;"], { type: "text/javascript" }));
				try {
					await import(url);
				} catch (e) {
					return "blob: modülü açılamıyor (güvenlik başlığı?): " + errText(e);
				} finally {
					URL.revokeObjectURL(url);
				}
				return "";
			})();
		}
		return support;
	}

	// Yükleme hangi ONNX Runtime derlemesini seçecekse önbellekte onun dosyalarına bakılır.
	async function chooseBuild(gpu) {
		if (ortBuild) return ortBuild;
		return gpu && (await gpuAvailable()) ? "webgpu" : "wasm";
	}

	async function probe(msg) {
		const problem = await supported();
		if (problem) return { ok: false, cached: false, reason: problem };
		const build = await chooseBuild(!!msg.gpu);
		const has = async (list) => (await Promise.all(list.map(present))).every(Boolean);
		const cached = (ort || (await has(ORT_FILES[build]))) && (await has(EMA_FILES));
		return { ok: true, cached: !!cached, build };
	}

	// ---------- yükleme ----------

	let ort = null;
	let ortBuild = "";
	let ema = null;

	async function gpuAvailable() {
		if (!self.navigator.gpu) return false;
		try {
			return !!(await self.navigator.gpu.requestAdapter());
		} catch (e) {
			return false;
		}
	}

	const blobUrl = (buf) => URL.createObjectURL(new Blob([buf], { type: "text/javascript" }));

	async function load(msg, id) {
		if (ema) return { build: ortBuild, already: true };
		const problem = await supported();
		if (problem) throw fail(problem, "support");

		const build = await chooseBuild(!!msg.gpu);
		const src = sources(msg.base, msg.fallback);
		const ortList = ort ? [] : ORT_FILES[build].map((f) => ({ f, urls: src.map((s) => s.ort + f.name) }));
		const modelList = EMA_FILES.map((f) => ({ f, urls: src.map((s) => s.model + f.name) }));
		const list = ortList.concat(modelList);
		const total = list.reduce((a, x) => a + x.f.size, 0);
		let done = 0;
		let last = 0;
		post({ ev: "progress", id, done: 0, total });
		const acct = (n) => {
			done += n;
			const now = performance.now();
			if (now - last > 200 || done >= total) {
				last = now;
				post({ ev: "progress", id, done: Math.max(0, Math.min(done, total)), total });
			}
		};
		const t0 = performance.now();
		const got = await Promise.all(list.map((x) => getFile(x.f, x.urls, acct, msg.net === true)));
		const fromNet = got.some((g) => g.net);
		const buf = (i) => got[i].buf;
		post({ ev: "stage", id, stage: "setup" });

		const blobs = [];
		const sessions = {};
		const m = ortList.length;
		try {
			if (!ort) {
				blobs.push(blobUrl(buf(0)), blobUrl(buf(1)));
				const mod = await import(blobs[0]);
				mod.env.wasm.numThreads = 1; // COOP/COEP başlığı yok: tek çekirdekli WASM
				mod.env.wasm.proxy = false;
				mod.env.wasm.wasmPaths = { mjs: blobs[1] };
				mod.env.wasm.wasmBinary = buf(2);
				mod.env.logLevel = "error";
				ort = mod;
				ortBuild = build;
			}
			const meta = JSON.parse(new TextDecoder().decode(buf(m)));
			const normalize = await loadNormalizer(buf(m + 1));
			const opts = {
				executionProviders: ortBuild === "webgpu" ? ["webgpu", "wasm"] : ["wasm"],
				graphOptimizationLevel: "all",
				logSeverityLevel: 3,
			};
			for (const [name, i] of [["text", m + 2], ["sound", m + 3], ["decoder", m + 4]]) {
				sessions[name] = await ort.InferenceSession.create(new Uint8Array(buf(i)), opts);
			}
			const engine = new EMA(meta, sessions, normalize);
			// Isınma: ilk çalıştırmanın ek maliyeti (bellek ayırma, WebGPU'da gölgelendirici derleme) okumanın
			// ilk cümlesine binmesin. WebGPU sorunları da okuma başlamadan burada ortaya çıkar.
			post({ ev: "stage", id, stage: "warmup" });
			for await (const wav of engine.stream("Merhaba.", { quick: true })) {
				if (!wav) break;
			}
			ema = engine;
		} catch (e) {
			for (const s of Object.values(sessions)) await s.release().catch(() => {});
			throw fail("Motor kurulamadı: " + errText(e), build === "webgpu" ? "gpu" : "setup");
		} finally {
			// ONNX Runtime modülleri yüklendi; geçici blob adresleri bırakılır.
			for (const u of blobs) URL.revokeObjectURL(u);
		}
		tidy(list.map((x) => x.f));
		return { build: ortBuild, fromNet, ms: Math.round(performance.now() - t0) };
	}

	// Eski sürümlerin önbellekteki dosyaları silinir (yer kaplamasın). Kullanılmayan ONNX Runtime
	// derlemesinin dosyaları, WebGPU'dan WASM'a geçişte yeniden gerekebileceği için tutulur.
	async function tidy(used) {
		const cache = await openCache();
		if (!cache) return;
		const keep = new Set(used.concat(ORT_FILES.wasm, ORT_FILES.webgpu, EMA_FILES).map(cacheKey));
		try {
			for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
		} catch (e) {
			// Önemli değil.
		}
	}

	// ---------- ses üretme ----------

	async function synth(msg, id) {
		if (!ema) throw fail("Model yüklü değil", "state");
		if (id <= cancelUpTo) return { cancelled: true, audioSec: 0, synthMs: 0 };
		const text = typeof msg.text === "string" ? msg.text.slice(0, 2000) : "";
		const speed = Math.max(0.5, Math.min(2, Number(msg.speed) || 1));
		const t0 = performance.now();
		let samples = 0;
		let firstMs = null;
		let cancelled = false;
		try {
			for await (const wav of ema.stream(text, { speed, quick: !!msg.quick })) {
				if (firstMs === null) firstMs = performance.now() - t0;
				samples += wav.length;
				// ms: işin başından bu parçaya kadar geçen üretim süresi (cihaz hızının ölçümü için)
				post({ ev: "audio", id, pcm: wav, ms: performance.now() - t0 }, [wav.buffer]);
				await yieldNow();
				if (id <= cancelUpTo) {
					cancelled = true;
					break;
				}
			}
		} catch (e) {
			throw fail("Ses üretilemedi: " + errText(e), ortBuild === "webgpu" ? "gpu" : "synth");
		}
		return { cancelled, audioSec: samples / RATE, synthMs: performance.now() - t0, firstMs };
	}

	// ---------- normalizer.js (normalizer-tr, WebAssembly) ----------

	const enc = new TextEncoder();
	const dec = new TextDecoder();
	async function loadNormalizer(bytes) {
		const { instance } = await WebAssembly.instantiate(bytes, {});
		const w = instance.exports;
		return (text) => {
			const input = enc.encode(text);
			const ptr = w.alloc(input.length);
			new Uint8Array(w.memory.buffer, ptr, input.length).set(input);
			w.normalize(ptr, input.length);
			w.dealloc(ptr, input.length);
			return dec.decode(new Uint8Array(w.memory.buffer, w.result_ptr(), w.result_len()));
		};
	}

	// ---------- tts.js ----------

	const RATE = 48000;
	// İlk parçada çözme pencereleri kademeli büyür (kare: 1/25 sn): ilk ses çabuk gelir, sonraki
	// pencereler çalan sesin süresi içinde yetişir (Faz 0: telefonda 4 sn'lik ikinci pencere takılıyordu).
	const QUICK_WINDOWS = [25, 50, 100];
	const WINDOW = 100;
	const CONTEXT = 8;
	const MAX_WORD_FRAMES = 250;
	const MAX_FRAMES = 3000;

	const TURKISH = new Set("çğıöşüÇĞİÖŞÜ");
	const TYPOGRAPHY = {
		"’": "'", "‘": "'", "ʼ": "'", "´": "'", "`": "'", "“": "\"", "”": "\"", "„": "\"",
		"«": "\"", "»": "\"", "–": "-", "—": "-", "−": "-", "…": "...",
	};
	// Denetim karakterleri ve yön işaretleri
	const UNSAFE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/g;
	const BLOCK_BYTES = 8 * 1024;

	function blocks(text) {
		const out = [];
		let block = [];
		let size = 0;
		for (const word of text.split(/\s+/).filter(Boolean)) {
			const n = enc.encode(word).length + 1;
			if (block.length && size + n > BLOCK_BYTES) {
				out.push(block.join(" "));
				block = [];
				size = 0;
			}
			block.push(word);
			size += n;
		}
		if (block.length) out.push(block.join(" "));
		return out;
	}

	function frontend(text, vocab, normalize) {
		text = text.replace(UNSAFE, " ");
		if (!text.trim()) return "";
		return alphabet(blocks(text).map(normalize).join(" "), vocab);
	}

	function alphabet(text, vocab) {
		text = text.replace(UNSAFE, " ");
		text = [...text].map((ch) => (ch in TYPOGRAPHY ? TYPOGRAPHY[ch] : ch)).join("");
		text = text.replace(/İ/g, "i").replace(/I/g, "ı").toLocaleLowerCase("tr");
		let out = "";
		for (let ch of text) {
			if (!TURKISH.has(ch)) ch = ch.normalize("NFKD").replace(/\p{M}/gu, "");
			out += ch && [...ch].every((c) => vocab.has(c)) ? ch : " ";
		}
		return out.replace(/\s+/g, " ").trim();
	}

	const LETTERS_PER_SECOND = 18;
	const MAX_SECONDS = 10;
	const MAX_LETTERS = 250;
	const SENTENCE_PAUSE = 0.25;
	const CLAUSE_PAUSE = 0.12;
	const CUTS = [[/[.!?]+["')]*(?= )/g, SENTENCE_PAUSE], [/[,;:](?= )/g, CLAUSE_PAUSE], [/\S(?= )/g, CLAUSE_PAUSE]];

	function finish(piece) {
		if (/[.!?]$/.test(piece.replace(/["')]+$/, ""))) return piece;
		return piece.replace(/[,;:\- ]+$/, "") + ".";
	}

	function chunk(text, speed) {
		const limit = Math.floor(Math.min(MAX_LETTERS, LETTERS_PER_SECOND * MAX_SECONDS * speed));
		const pieces = [];
		let rest = text.trim();
		while (rest) {
			let cut = rest.length;
			let pause = 0;
			if (rest.length > limit) {
				cut = limit;
				const head = rest.slice(0, limit + 1);
				for (const [pattern, gap] of CUTS) {
					const ends = [...head.matchAll(pattern)].map((m) => m.index + m[0].length);
					if (ends.length) {
						cut = ends[ends.length - 1];
						pause = gap;
						break;
					}
				}
			}
			const piece = rest.slice(0, cut).trim();
			rest = rest.slice(cut).trim();
			if (/\p{L}/u.test(piece)) pieces.push([finish(piece), pause]);
		}
		if (pieces.length) pieces[pieces.length - 1][1] = 0;
		return pieces;
	}

	function gaussian(seed) {
		let a = seed >>> 0;
		const uniform = () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		return (n) => {
			const out = new Float32Array(n);
			for (let i = 0; i < n; i += 2) {
				const r = Math.sqrt(-2 * Math.log(1 - uniform()));
				const th = 2 * Math.PI * uniform();
				out[i] = r * Math.cos(th);
				if (i + 1 < n) out[i + 1] = r * Math.sin(th);
			}
			return out;
		};
	}

	function words(text) {
		const starts = [];
		for (let i = 0; i < text.length; i++) if (text[i] !== " " && (i === 0 || text[i - 1] === " ")) starts.push(i);
		if (!starts.length) starts.push(0);
		const bounds = [0, ...starts.slice(1), text.length];
		const cw = [];
		const wstart = [];
		for (let w = 0; w + 1 < bounds.length; w++) {
			for (let i = bounds[w]; i < bounds[w + 1]; i++) {
				cw.push(w);
				wstart.push(bounds[w]);
			}
		}
		return { cw, wstart };
	}

	function plan(cw, wstart, dur, speed) {
		const L = cw.length;
		const nWords = cw[L - 1] + 1;
		const d = Float32Array.from(dur, (x) => x / speed);
		const sums = new Float64Array(nWords);
		for (let i = 0; i < L; i++) sums[cw[i]] += d[i];
		const counts = Array.from(sums, (s) => Math.min(MAX_WORD_FRAMES, Math.max(1, Math.round(s))));
		const T = Math.min(counts.reduce((a, b) => a + b, 0), MAX_FRAMES);
		const fw = new Int32Array(T);
		const fp = new Float32Array(T);
		for (let w = 0, f = 0; w < nWords; w++) {
			for (let j = 0; j < counts[w] && f < T; j++, f++) {
				fw[f] = w;
				fp[f] = j / counts[w];
			}
		}
		const c = Float32Array.from(d, (x) => Math.max(x, 1e-4));
		const done = new Float32Array(L);
		const total = new Float32Array(nWords);
		for (let i = 0, acc = 0; i < L; i++) {
			acc += c[i];
			done[i] = acc;
			total[cw[i]] += c[i];
		}
		const before = (i) => done[i] - c[i];
		const wlen = new Float32Array(nWords);
		for (const w of cw) wlen[w] += 1;
		const woff = new Float32Array(nWords);
		for (let w = 1; w < nWords; w++) woff[w] = woff[w - 1] + Math.max(wlen[w - 1], 1);
		const cg = new Float32Array(L);
		const fg = new Float32Array(T);
		for (let i = 0; i < L; i++) {
			const cp = Math.min(1, Math.max(0, (done[i] - before(wstart[i]) - 0.5 * c[i]) / Math.max(total[cw[i]], 1e-8)));
			cg[i] = woff[cw[i]] + cp * Math.max(wlen[cw[i]], 1);
		}
		for (let f = 0; f < T; f++) fg[f] = woff[fw[f]] + fp[f] * Math.max(wlen[fw[f]], 1);
		return { T, fw, cg, fg };
	}

	function windows(frames, quick) {
		const spans = [];
		for (let s = 0, k = 0; s < frames; k++) {
			const size = quick ? QUICK_WINDOWS[k] || WINDOW : WINDOW;
			const e = Math.min(frames, s + size);
			spans.push([s, e]);
			s = e;
		}
		return spans;
	}

	const i64 = (arr) => new ort.Tensor("int64", BigInt64Array.from(arr, (x) => BigInt(x)), [1, arr.length]);
	const f32 = (arr, dims) => new ort.Tensor("float32", arr, dims);

	class EMA {
		constructor(meta, sessions, normalize) {
			this.text = sessions.text;
			this.sound = sessions.sound;
			this.decoder = sessions.decoder;
			this.normalize = normalize;
			this.meta = meta;
			this.stoi = new Map(meta.vocab.map((ch, i) => [ch, i]));
			this.alpha = new Set(meta.vocab.filter((v) => v.length === 1));
		}

		async *stream(text, { speed = 1, seed = 0, quick = false } = {}) {
			const pieces = chunk(frontend(text, this.alpha, this.normalize), speed);
			const nSteps = this.meta.times.length;
			const D = this.meta.latent_dim;
			const hop = this.meta.hop;
			for (let k = 0; k < pieces.length; k++) {
				const [piece, pause] = pieces[k];
				const ids = [...piece].map((ch) => (this.stoi.has(ch) ? this.stoi.get(ch) : 1));
				const { cw, wstart } = words(piece);
				const { h, dur } = await this.text.run({ ids: i64(ids) });
				const durArr = await dur.getData();
				const { T, fw, cg, fg } = plan(cw, wstart, durArr, speed);

				const noise = gaussian(seed * 1000003 + k)(nSteps * T * D);
				const { latents } = await this.sound.run({
					h,
					cg: f32(cg, [1, cg.length]),
					fg: f32(fg, [1, T]),
					cw: i64(cw),
					fw: i64(fw),
					noise: f32(noise, [1, nSteps, T, D]),
				});
				const lat = await latents.getData();

				for (const [s, e] of windows(T, quick && k === 0)) {
					const a = Math.max(0, s - CONTEXT);
					const b = Math.min(T, e + CONTEXT);
					const n = b - a;
					const z = new Float32Array(D * n);
					for (let f = 0; f < n; f++) for (let d = 0; d < D; d++) z[d * n + f] = lat[(a + f) * D + d];
					const { audio } = await this.decoder.run({ z: f32(z, [1, D, n]) });
					yield (await audio.getData()).slice((s - a) * hop, (e - a) * hop);
				}
				if (pause) yield new Float32Array(Math.round(pause * RATE));
			}
		}
	}

	post({ ev: "ready" });
})();

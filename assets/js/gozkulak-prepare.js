/*!
 * GözKulak — hazır ses hazırlama (Ayarlar → GözKulak, yalnızca yöneticiler).
 *
 * Seçilen her sayfa görünmez bir çerçevede açılır; sayfadaki GözKulak, okunacak üretim birimlerini ve
 * dosya adlarını verir (GozKulak.units). Sitede olmayan birimler doğal ses motoruyla (aynı Worker)
 * üretilir, Opus'a kodlanır (gozkulak-opus.js) ve REST ile yüklenir. Sonunda sayfanın listesi kaydedilir.
 */
(() => {
	"use strict";

	const box = document.getElementById("gozkulak-prepare");
	const cfgEl = document.getElementById("gozkulak-prepare-config");
	if (!box || !cfgEl) return;
	let cfg;
	try {
		cfg = JSON.parse(cfgEl.textContent);
	} catch (e) {
		return;
	}

	const $ = (sel) => box.querySelector(sel);
	const rows = () => [...box.querySelectorAll("tbody tr[data-id]")];
	const statusEl = $(".gozkulak-prep-status");
	const runBtn = $(".gozkulak-prep-run");
	const stopBtn = $(".gozkulak-prep-stop");
	const cleanBtn = $(".gozkulak-prep-cleanup");
	const purgeBtn = $(".gozkulak-prep-purge");
	const typeSel = $(".gozkulak-prep-type");
	const allBox = $(".gozkulak-prep-all");
	let stopped = false;
	let busy = false;

	const say = (text) => {
		statusEl.textContent = text;
	};
	const stateOf = (row, text) => {
		row.querySelector(".gozkulak-prep-state").textContent = text;
	};
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	function setBusy(on) {
		busy = on;
		runBtn.disabled = on;
		cleanBtn.disabled = on;
		purgeBtn.disabled = on;
		stopBtn.hidden = !on;
		stopBtn.disabled = false;
	}

	// ---------- REST ----------

	async function rest(path, body, json) {
		const headers = { "X-WP-Nonce": cfg.nonce };
		if (json) headers["Content-Type"] = "application/json";
		else if (body) headers["Content-Type"] = "application/octet-stream";
		const r = await fetch(cfg.rest + path, {
			method: "POST",
			credentials: "same-origin",
			headers,
			body: json ? JSON.stringify(json) : body,
		});
		const data = await r.json().catch(() => null);
		if (!r.ok) {
			const err = new Error((data && data.message) || "HTTP " + r.status);
			err.status = r.status;
			throw err;
		}
		return data || {};
	}

	async function exists(hash) {
		try {
			const r = await fetch(cfg.uploads + hash.slice(0, 2) + "/" + hash + ".ogg", { method: "HEAD", cache: "no-store", credentials: "same-origin" });
			return r.ok;
		} catch (e) {
			return false;
		}
	}

	// ---------- doğal ses motoru ----------

	let worker = null;
	let seq = 0;
	const calls = new Map();
	let engine = null;

	function spawn() {
		if (worker) return Promise.resolve();
		return new Promise((resolve, reject) => {
			// Trusted Types zorunluysa adres "gozkulak" politikasından geçer (yalnızca ayarlardaki adres).
			const tt = window.trustedTypes;
			let url = cfg.worker;
			if (tt && typeof tt.createPolicy === "function") {
				try {
					url = tt.createPolicy("gozkulak", {
						createScriptURL: (u) => {
							if (u !== cfg.worker) throw new TypeError("GözKulak: beklenmeyen Worker adresi");
							return u;
						},
					}).createScriptURL(cfg.worker);
				} catch (e) {
					// Politika kurulamadı: düz adresle denenir.
				}
			}
			const w = new Worker(url, { type: "module", name: "gozkulak-prepare" });
			worker = w;
			const timer = setTimeout(() => reject(new Error("Doğal ses motoru başlatılamadı")), 15000);
			w.onmessage = (e) => {
				const m = e.data;
				if (!m || typeof m !== "object") return;
				if (m.ev === "ready") {
					clearTimeout(timer);
					resolve();
					return;
				}
				const c = calls.get(m.id);
				if (!c) return;
				if (m.ev === "result") {
					calls.delete(m.id);
					c.resolve(m.data || {});
				} else if (m.ev === "error") {
					calls.delete(m.id);
					const err = new Error(String(m.message || "Hata"));
					err.code = String(m.code || "");
					c.reject(err);
				} else if (c.onEvent) {
					c.onEvent(m);
				}
			};
			w.onerror = (e) => {
				if (e && e.preventDefault) e.preventDefault();
				clearTimeout(timer);
				const err = new Error("Doğal ses motoru hatası: " + ((e && e.message) || "bilinmiyor"));
				err.code = "crash";
				kill(err);
				reject(err);
			};
		});
	}

	function kill(err) {
		if (worker) worker.terminate();
		worker = null;
		engine = null;
		for (const c of calls.values()) c.reject(err || new Error("Durduruldu"));
		calls.clear();
	}

	async function call(msg, onEvent) {
		await spawn();
		return new Promise((resolve, reject) => {
			const id = ++seq;
			calls.set(id, { resolve, reject, onEvent });
			worker.postMessage(Object.assign({}, msg, { id }));
		});
	}

	// Masaüstünde WebGPU denenir; kurulamazsa WASM.
	function load() {
		if (engine) return engine;
		const attempt = (gpu) => call({ cmd: "load", base: cfg.base, fallback: cfg.fallback, gpu, net: true }, (m) => {
			if (m.ev === "progress" && m.total) say("Doğal ses motoru indiriliyor: %" + Math.floor((m.done / m.total) * 100));
			else if (m.ev === "stage") say("Doğal ses motoru hazırlanıyor…");
		});
		engine = (async () => {
			const gpu = "gpu" in navigator && !(navigator.userAgentData && navigator.userAgentData.mobile);
			try {
				return await attempt(gpu);
			} catch (err) {
				if (!gpu || err.code !== "gpu") throw err;
				kill();
				return attempt(false);
			}
		})();
		engine.catch(() => {
			engine = null;
		});
		return engine;
	}

	async function synth(text) {
		const parts = [];
		const st = await call({ cmd: "synth", text, speed: 1, quick: false }, (m) => {
			if (m.ev === "audio" && m.pcm instanceof Float32Array) parts.push(m.pcm);
		});
		const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
		let at = 0;
		for (const p of parts) {
			pcm.set(p, at);
			at += p.length;
		}
		return { pcm, ms: Number(st.synthMs) || 0 };
	}

	// ---------- sayfanın birimleri ----------

	let frame = null;

	function waitLoad(f, ms) {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error("Sayfa açılamadı (zaman aşımı)")), ms);
			f.addEventListener("load", () => {
				clearTimeout(timer);
				resolve();
			}, { once: true });
		});
	}

	// Sayfa ekran dışında açılır. GözKulak yalnızca görünen öğeleri okur; temalar bazı bölümleri ekran
	// genişliğine göre gizler ya da iki kez yazar (BeTheme: hide-desktop, hide-mobile…). Bu yüzden sayfa
	// geniş masaüstü, dizüstü, tablet ve telefon genişliklerinde okunur; birimlerin birleşimi hazırlanır.
	const WIDTHS = [1920, 1280, 900, 390];

	async function unitsOf(url) {
		if (!frame) {
			frame = document.createElement("iframe");
			frame.className = "gozkulak-prep-frame";
			frame.setAttribute("aria-hidden", "true");
			frame.setAttribute("tabindex", "-1");
			frame.title = "";
			document.body.append(frame);
		}
		const loaded = waitLoad(frame, 45000);
		frame.src = url;
		await loaded;
		let win;
		try {
			win = frame.contentWindow;
			void win.document;
		} catch (e) {
			throw new Error("Sayfa başka bir adresten açıldı; okunamıyor");
		}
		for (let i = 0; i < 100 && !(win.GozKulak && win.GozKulak.units); i++) {
			if (win.GozKulak && !win.GozKulak.units) throw new Error("Sayfadaki GözKulak betiği eski; site önbelleğini temizleyin");
			await sleep(100);
		}
		if (!win.GozKulak) throw new Error("Sayfada GözKulak yok (eklenti kapalı ya da sayfa önbellekten geldi)");
		await sleep(1000); // geç yüklenen içerik
		const list = [];
		try {
			for (const w of WIDTHS) {
				frame.style.width = w + "px";
				await sleep(500); // yeni genişlikte yerleşim ve temanın yeniden boyutlandırma betikleri
				list.push(...(await win.GozKulak.units()));
			}
		} finally {
			frame.style.width = "";
		}
		return list.filter((u) => u && /^[0-9a-f]{32}$/.test(u.hash) && typeof u.text === "string");
	}

	// ---------- hazırlama ----------

	async function prepare(row) {
		stateOf(row, "Sayfa açılıyor…");
		const units = await unitsOf(row.dataset.url);
		const seen = new Set();
		const unique = units.filter((u) => !seen.has(u.hash) && seen.add(u.hash));
		const missing = [];
		for (const u of unique) if (!(await exists(u.hash))) missing.push(u);
		let done = 0;
		let audio = 0;
		let spent = 0;
		for (const u of missing) {
			if (stopped) break;
			stateOf(row, "Üretiliyor: " + done + " / " + missing.length);
			await load();
			const r = await synth(u.text);
			if (!r.pcm.length) continue;
			const bytes = await window.GozKulakOpus.encode(r.pcm, 24000);
			await rest("audio/" + u.hash, bytes);
			audio += r.pcm.length / 48000;
			spent += r.ms / 1000;
			done++;
		}
		const res = await rest("page/" + row.dataset.id, null, { files: unique.map((u) => u.hash) });
		const left = (res.missing || []).length;
		row.dataset.count = String(res.saved || 0);
		if (!unique.length) stateOf(row, "Okunacak Türkçe metin yok");
		else if (left) stateOf(row, (res.saved || 0) + " / " + unique.length + " hazır (" + left + " eksik)");
		else stateOf(row, unique.length + " / " + unique.length + " hazır");
		return { audio, spent, made: done };
	}

	runBtn.addEventListener("click", async () => {
		if (busy) return;
		const picked = rows().filter((r) => !r.hidden && r.querySelector(".gozkulak-prep-pick").checked);
		if (!picked.length) {
			say("Önce sayfa seçin.");
			return;
		}
		if (!window.GozKulakOpus || !window.GozKulakOpus.supported()) {
			say("Bu tarayıcı sesi kodlayamıyor (WebCodecs yok). Masaüstünde Chrome ya da Firefox kullanın.");
			return;
		}
		stopped = false;
		setBusy(true);
		let audio = 0;
		let spent = 0;
		let made = 0;
		let failed = 0;
		try {
			for (let i = 0; i < picked.length && !stopped; i++) {
				say("Sayfa " + (i + 1) + " / " + picked.length + ": " + picked[i].dataset.title);
				try {
					const r = await prepare(picked[i]);
					audio += r.audio;
					spent += r.spent;
					made += r.made;
				} catch (err) {
					failed++;
					stateOf(picked[i], "Hata: " + (err.message || err));
					// Motor çöktüyse ya da oturum/yetki sorunu varsa sonraki sayfalar da başarısız olur.
					if (err.code === "crash" || err.status === 401 || err.status === 403) break;
				}
			}
			const speed = spent > 0 ? ", üretim " + (audio / spent).toFixed(1) + "× gerçek zaman" : "";
			say((stopped ? "Durduruldu. " : "Bitti. ") + made + " yeni ses dosyası" + speed + (failed ? ", " + failed + " sayfada hata" : "") + ". Sitenin önbelleğini temizlemeyi unutmayın.");
		} finally {
			setBusy(false);
			if (frame) frame.src = "about:blank";
		}
	});

	stopBtn.addEventListener("click", () => {
		stopped = true;
		stopBtn.disabled = true;
		say("Durduruluyor: süren cümle bitince…");
	});

	cleanBtn.addEventListener("click", async () => {
		if (busy) return;
		setBusy(true);
		try {
			const r = await rest("cleanup");
			say("Kullanılmayan " + (r.deleted || 0) + " dosya silindi.");
		} catch (err) {
			say("Hata: " + (err.message || err));
		} finally {
			setBusy(false);
		}
	});

	purgeBtn.addEventListener("click", async () => {
		if (busy || !window.confirm("Bütün hazır ses dosyaları ve sayfa listeleri silinsin mi?")) return;
		setBusy(true);
		try {
			await rest("purge");
			for (const row of rows()) {
				row.dataset.count = "0";
				stateOf(row, "—");
			}
			say("Bütün hazır sesler silindi.");
		} catch (err) {
			say("Hata: " + (err.message || err));
		} finally {
			setBusy(false);
		}
	});

	typeSel.addEventListener("change", () => {
		for (const row of rows()) row.hidden = typeSel.value !== "" && row.dataset.type !== typeSel.value;
		allBox.checked = false;
	});

	allBox.addEventListener("change", () => {
		for (const row of rows()) if (!row.hidden) row.querySelector(".gozkulak-prep-pick").checked = allBox.checked;
	});

	window.addEventListener("beforeunload", (e) => {
		if (busy) e.preventDefault();
	});
})();

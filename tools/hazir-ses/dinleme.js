/*
 * Hazır ses dinleme denemesi (Faz 2.4, 1. adım). Eklenti paketine girmez.
 *
 * Doğal ses motoru (assets/js/gozkulak-tts-worker.js) ve hazır ses kodlayıcısı (assets/js/gozkulak-opus.js)
 * aynen kullanılır.
 * Adres parametreleri (testler için): ?w=<Worker adresi>&b=<ses dosyalarının adresi>
 */
(() => {
	"use strict";

	const RATE = 48000;
	const SPEEDS = [0.8, 1, 1.2, 1.45];
	const q = new URLSearchParams(location.search);
	const WORKER = q.get("w") || "../../assets/js/gozkulak-tts-worker.js";
	const $ = (id) => document.getElementById(id);
	if (q.get("b")) $("base").value = q.get("b");
	$("gpu").checked = "gpu" in navigator && !!navigator.userAgentData && navigator.userAgentData.mobile === false;

	function h(tag, attrs, ...kids) {
		const el = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs || {})) {
			if (k === "text") el.textContent = v;
			else el.setAttribute(k, v);
		}
		el.append(...kids);
		return el;
	}

	function log(text, bad) {
		const line = h("div", { text });
		if (bad) line.className = "err";
		$("log").append(line);
		$("log").scrollTop = $("log").scrollHeight;
	}

	// ---------- Worker istemcisi ----------

	let worker = null;
	let seq = 0;
	const calls = new Map();

	function spawn() {
		if (worker) return Promise.resolve();
		return new Promise((resolve, reject) => {
			worker = new Worker(new URL(WORKER, location.href), { type: "module" });
			worker.onmessage = (e) => {
				const m = e.data;
				if (m.ev === "ready") return resolve();
				const c = calls.get(m.id);
				if (!c) return;
				if (m.ev === "result") {
					calls.delete(m.id);
					c.resolve(m.data || {});
				} else if (m.ev === "error") {
					calls.delete(m.id);
					c.reject(new Error(m.message + (m.code ? " (" + m.code + ")" : "")));
				} else if (c.onEvent) {
					c.onEvent(m);
				}
			};
			worker.onerror = (e) => {
				e.preventDefault();
				reject(new Error("Worker hatası: " + (e.message || "bilinmiyor")));
			};
		});
	}

	async function call(msg, onEvent) {
		await spawn();
		return new Promise((resolve, reject) => {
			const id = ++seq;
			calls.set(id, { resolve, reject, onEvent });
			worker.postMessage(Object.assign({}, msg, { id }));
		});
	}

	let loaded = null;
	function load() {
		if (loaded) return loaded;
		let last = -1;
		loaded = call({ cmd: "load", base: $("base").value.trim(), fallback: false, gpu: $("gpu").checked, net: true }, (m) => {
			if (m.ev === "progress" && m.total) {
				const pc = Math.floor((m.done / m.total) * 10) * 10;
				if (pc !== last) log("İndiriliyor: %" + (last = pc));
			} else if (m.ev === "stage") {
				log("Aşama: " + m.stage);
			}
		});
		loaded.catch(() => {
			loaded = null;
		});
		return loaded;
	}

	async function synth(text, speed) {
		const parts = [];
		const st = await call({ cmd: "synth", text, speed, quick: false }, (m) => {
			if (m.ev === "audio") parts.push(m.pcm);
		});
		const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
		let at = 0;
		for (const p of parts) {
			pcm.set(p, at);
			at += p.length;
		}
		return { pcm, ms: st.synthMs };
	}

	function wav(pcm) {
		const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
		const str = (at, s) => [...s].forEach((c, i) => out.setUint8(at + i, c.charCodeAt(0)));
		str(0, "RIFF");
		out.setUint32(4, 36 + pcm.length * 2, true);
		str(8, "WAVEfmt ");
		out.setUint32(16, 16, true);
		out.setUint16(20, 1, true);
		out.setUint16(22, 1, true);
		out.setUint32(24, RATE, true);
		out.setUint32(28, RATE * 2, true);
		out.setUint16(32, 2, true);
		out.setUint16(34, 16, true);
		str(36, "data");
		out.setUint32(40, pcm.length * 2, true);
		for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
		return new Uint8Array(out.buffer);
	}

	// ---------- sayfa ----------

	const kb = (n) => (n / 1024).toFixed(0) + " KB";
	let ctx = null;

	// Dosyanın tarayıcıda çözülüp çözülmediği (ziyaretçide decodeAudioData kullanılacak)
	async function check(bytes, sec) {
		ctx = ctx || new AudioContext();
		try {
			const buf = await ctx.decodeAudioData(bytes.slice().buffer);
			return "çözüldü, " + buf.duration.toFixed(2) + " sn (beklenen " + sec.toFixed(2) + ")";
		} catch (e) {
			return "ÇÖZÜLEMEDİ: " + (e.message || e);
		}
	}

	function player(title, bytes, type, meta, rate) {
		const a = h("audio", { controls: "", preload: "auto", src: URL.createObjectURL(new Blob([bytes], { type })) });
		if (rate && rate !== 1) {
			a.preservesPitch = true;
			a.defaultPlaybackRate = rate;
			a.playbackRate = rate;
			a.addEventListener("play", () => {
				a.playbackRate = rate;
			});
		}
		return h("div", { class: "row" }, h("b", { text: title }), a, h("span", { class: "meta", text: meta }));
	}

	$("run").addEventListener("click", async () => {
		const btn = $("run");
		const text = $("text").value.trim();
		if (!text) return;
		btn.disabled = true;
		try {
			if (!GozKulakOpus.supported()) throw new Error("Bu tarayıcıda WebCodecs AudioEncoder yok");
			const t0 = performance.now();
			const info = await load();
			log("Motor hazır: " + info.build + ", " + ((performance.now() - t0) / 1000).toFixed(1) + " sn");

			const made = {};
			for (const speed of SPEEDS) {
				const r = await synth(text, speed);
				const sec = r.pcm.length / RATE;
				made[speed] = r;
				log(speed + "×: " + sec.toFixed(1) + " sn ses, " + (r.ms / 1000).toFixed(1) + " sn'de üretildi (" + (sec / (r.ms / 1000)).toFixed(1) + "× gerçek zaman)");
			}

			const one = made[1].pcm;
			const sec1 = one.length / RATE;
			const qs = $("quality");
			qs.querySelectorAll(".row").forEach((x) => x.remove());
			const raw = wav(one);
			qs.append(player("Sıkıştırılmamış", raw, "audio/wav", kb(raw.length)));
			const ogg24 = await GozKulakOpus.encode(one, 24000);
			const ogg32 = await GozKulakOpus.encode(one, 32000);
			qs.append(player("Opus 24 kbps", ogg24, "audio/ogg", kb(ogg24.length) + " · " + await check(ogg24, sec1)));
			qs.append(player("Opus 32 kbps", ogg32, "audio/ogg", kb(ogg32.length) + " · " + await check(ogg32, sec1)));
			qs.hidden = false;

			const s = $("speeds");
			s.querySelectorAll(".row").forEach((x) => x.remove());
			for (const speed of SPEEDS) {
				if (speed === 1) continue;
				const own = await GozKulakOpus.encode(made[speed].pcm, 24000);
				s.append(player(speed + "× Model", own, "audio/ogg", kb(own.length)));
				s.append(player(speed + "× Hızlandırma", ogg24, "audio/ogg", "1× dosya, " + speed + "× çalınıyor", speed));
			}
			s.hidden = false;
			log("Hazır. Dinleyip karar verin.");
		} catch (e) {
			log("Hata: " + (e.message || e), true);
		} finally {
			btn.disabled = false;
		}
	});
})();

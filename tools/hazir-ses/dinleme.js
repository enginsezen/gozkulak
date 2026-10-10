/*
 * Hazır ses dinleme denemesi (Faz 2.4, 1. adım). Eklenti paketine girmez.
 *
 * Doğal ses motoru (assets/js/gozkulak-tts-worker.js) aynen kullanılır. Üretilen ses WebCodecs ile
 * Opus'a kodlanır ve Ogg kabına yazılır; hazır ses yüklemesinde de aynı paketleyici kullanılacak.
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

	// ---------- Ogg Opus ----------

	const CRC = (() => {
		const t = new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			let r = i << 24;
			for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
			t[i] = r >>> 0;
		}
		return t;
	})();

	function crc32(bytes) {
		let c = 0;
		for (let i = 0; i < bytes.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
		return c;
	}

	// Bir Ogg sayfası: flags 2 = ilk sayfa, 4 = son sayfa. granule: sayfada biten son paketin sonu.
	function page(packets, granule, serial, no, flags) {
		const lacing = [];
		for (const p of packets) {
			let n = p.length;
			while (n >= 255) {
				lacing.push(255);
				n -= 255;
			}
			lacing.push(n);
		}
		const size = 27 + lacing.length + packets.reduce((n, p) => n + p.length, 0);
		const out = new Uint8Array(size);
		const dv = new DataView(out.buffer);
		out.set([0x4f, 0x67, 0x67, 0x53], 0); // OggS
		out[5] = flags;
		dv.setBigUint64(6, BigInt(granule), true);
		dv.setUint32(14, serial, true);
		dv.setUint32(18, no, true);
		out[26] = lacing.length;
		out.set(lacing, 27);
		let at = 27 + lacing.length;
		for (const p of packets) {
			out.set(p, at);
			at += p.length;
		}
		dv.setUint32(22, crc32(out), true);
		return out;
	}

	const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));

	// packets: [{ data, samples }]; total: kodlanan sesin örnek sayısı (sondaki dolgu atılsın)
	function ogg(packets, preSkip, total) {
		const serial = 0x474b; // "GK"
		const head = new Uint8Array(19);
		head.set(ascii("OpusHead"), 0);
		head[8] = 1; // sürüm
		head[9] = 1; // tek kanal
		new DataView(head.buffer).setUint16(10, preSkip, true);
		new DataView(head.buffer).setUint32(12, RATE, true);
		const vendor = ascii("GozKulak");
		const tags = new Uint8Array(8 + 4 + vendor.length + 4);
		tags.set(ascii("OpusTags"), 0);
		new DataView(tags.buffer).setUint32(8, vendor.length, true);
		tags.set(vendor, 12);

		const pages = [page([head], 0, serial, 0, 2), page([tags], 0, serial, 1, 0)];
		const end = preSkip + total;
		let granule = preSkip;
		let batch = [];
		let segs = 0;
		let bytes = 0;
		const emit = (last) => {
			pages.push(page(batch, Math.min(granule, end), serial, pages.length, last ? 4 : 0));
			batch = [];
			segs = 0;
			bytes = 0;
		};
		packets.forEach((p, i) => {
			const need = Math.floor(p.data.length / 255) + 1;
			if (batch.length && (segs + need > 255 || bytes > 4000)) emit(false);
			batch.push(p.data);
			segs += need;
			bytes += p.data.length;
			granule += p.samples;
			if (i === packets.length - 1) emit(true);
		});
		const out = new Uint8Array(pages.reduce((n, p) => n + p.length, 0));
		let at = 0;
		for (const p of pages) {
			out.set(p, at);
			at += p.length;
		}
		return out;
	}

	async function opus(pcm, bitrate) {
		const packets = [];
		let desc = null;
		let failed = null;
		const enc = new AudioEncoder({
			output(chunk, meta) {
				const data = new Uint8Array(chunk.byteLength);
				chunk.copyTo(data);
				packets.push({ data, samples: Math.round(((chunk.duration || 20000) * RATE) / 1e6) });
				const d = meta && meta.decoderConfig && meta.decoderConfig.description;
				if (d && !desc) desc = ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d);
			},
			error(e) {
				failed = e;
			},
		});
		enc.configure({ codec: "opus", sampleRate: RATE, numberOfChannels: 1, bitrate });
		for (let at = 0; at < pcm.length; at += RATE) {
			const part = pcm.subarray(at, Math.min(pcm.length, at + RATE));
			enc.encode(new AudioData({ format: "f32-planar", sampleRate: RATE, numberOfChannels: 1, numberOfFrames: part.length, timestamp: Math.round((at / RATE) * 1e6), data: part }));
		}
		await enc.flush();
		enc.close();
		if (failed) throw failed;
		// Kodlayıcının gecikmesi (pre-skip) kendi OpusHead'inden alınır; yoksa libopus'un 48 kHz değeri
		const isHead = desc && desc.length >= 12 && String.fromCharCode(...desc.subarray(0, 8)) === "OpusHead";
		const preSkip = isHead ? desc[10] | (desc[11] << 8) : 312;
		return ogg(packets, preSkip, pcm.length);
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
			if (typeof AudioEncoder === "undefined") throw new Error("Bu tarayıcıda WebCodecs AudioEncoder yok");
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
			const ogg24 = await opus(one, 24000);
			const ogg32 = await opus(one, 32000);
			qs.append(player("Opus 24 kbps", ogg24, "audio/ogg", kb(ogg24.length) + " · " + await check(ogg24, sec1)));
			qs.append(player("Opus 32 kbps", ogg32, "audio/ogg", kb(ogg32.length) + " · " + await check(ogg32, sec1)));
			qs.hidden = false;

			const s = $("speeds");
			s.querySelectorAll(".row").forEach((x) => x.remove());
			for (const speed of SPEEDS) {
				if (speed === 1) continue;
				const own = await opus(made[speed].pcm, 24000);
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

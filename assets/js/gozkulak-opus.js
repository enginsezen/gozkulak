/*!
 * GözKulak — hazır ses kodlayıcı (yönetici paneli).
 *
 * Doğal ses motorunun ürettiği sesi (48 kHz, tek kanal, Float32) WebCodecs AudioEncoder ile Opus'a
 * kodlar ve Ogg kabına yazar. Dış kütüphane kullanılmaz. Ziyaretçi tarafında yüklenmez.
 */
(() => {
	"use strict";

	const RATE = 48000;

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

	window.GozKulakOpus = {
		supported: () => typeof window.AudioEncoder === "function" && typeof window.AudioData === "function",
		encode: opus,
	};
})();

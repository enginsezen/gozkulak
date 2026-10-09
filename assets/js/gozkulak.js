/*!
 * GözKulak — erişilebilirlik menüsü.
 * Menü Shadow DOM içinde çizilir; tema stilleri menüyü, menü stilleri temayı etkilemez.
 * Sayfaya HTML dizesi yazılmaz (innerHTML yok); tüm öğeler DOM işlemleriyle kurulur.
 * Ziyaretçinin seçimleri yalnızca kendi tarayıcısında (localStorage) saklanır.
 */
(() => {
	"use strict";

	if (window.GozKulak) return;

	const cfgNode = document.getElementById("gozkulak-config");
	if (!cfgNode) return;
	let cfg;
	try {
		cfg = JSON.parse(cfgNode.textContent);
	} catch (e) {
		return;
	}

	const doc = document;
	const htmlEl = doc.documentElement;
	const enabledFeatures = new Set(Array.isArray(cfg.features) ? cfg.features : []);
	const lang = /^en\b/i.test(htmlEl.lang || "") ? "en" : "tr";

	const STR = {
		tr: {
			open: "Erişilebilirlik menüsünü aç",
			title: "Erişilebilirlik",
			close: "Menüyü kapat",
			test: "Test modu: menüyü yalnızca yöneticiler görüyor.",
			vision: "Görme",
			reading: "Okuma ve dikkat",
			fontSize: "Yazı boyutu",
			fontDown: "Yazıyı küçült",
			fontUp: "Yazıyı büyüt",
			lineHeight: "Satır aralığı",
			letterSpacing: "Harf aralığı",
			contrast: "Yüksek kontrast",
			darkMode: "Koyu mod",
			grayscale: "Gri tonlama",
			readableFont: "Okunaklı yazı",
			highlightLinks: "Bağlantıları vurgula",
			bigCursor: "Büyük imleç",
			readingMask: "Okuma maskesi",
			readingGuide: "Okuma cetveli",
			stopAnimations: "Animasyonları durdur",
			hideImages: "Görselleri gizle",
			on: "Açık",
			off: "Kapalı",
			levels: ["Normal", "Geniş", "Çok geniş"],
			reset: "Tümünü sıfırla",
			resetDone: "Tüm ayarlar sıfırlandı.",
			shortcut: "Kısayol",
			stateOn: "açıldı",
			stateOff: "kapandı",
		},
		en: {
			open: "Open accessibility menu",
			title: "Accessibility",
			close: "Close menu",
			test: "Test mode: only administrators can see this menu.",
			vision: "Vision",
			reading: "Reading and focus",
			fontSize: "Text size",
			fontDown: "Decrease text size",
			fontUp: "Increase text size",
			lineHeight: "Line height",
			letterSpacing: "Letter spacing",
			contrast: "High contrast",
			darkMode: "Dark mode",
			grayscale: "Grayscale",
			readableFont: "Readable font",
			highlightLinks: "Highlight links",
			bigCursor: "Large cursor",
			readingMask: "Reading mask",
			readingGuide: "Reading guide",
			stopAnimations: "Stop animations",
			hideImages: "Hide images",
			on: "On",
			off: "Off",
			levels: ["Normal", "Wide", "Extra wide"],
			reset: "Reset all",
			resetDone: "All settings have been reset.",
			shortcut: "Shortcut",
			stateOn: "on",
			stateOff: "off",
		},
	}[lang];

	const SHORTCUT = { code: "KeyG", label: "Alt + Shift + G" };
	const FONT_STEPS = [1, 1.15, 1.3, 1.5, 1.75];
	const LEVELS = 3;

	// Ayar anahtarı (sunucu) → tercih anahtarı (tarayıcı)
	const FEATURES = {
		font_size: "fontSize",
		line_height: "lineHeight",
		letter_spacing: "letterSpacing",
		contrast: "contrast",
		dark_mode: "darkMode",
		grayscale: "grayscale",
		readable_font: "readableFont",
		highlight_links: "highlightLinks",
		big_cursor: "bigCursor",
		reading_mask: "readingMask",
		reading_guide: "readingGuide",
		stop_animations: "stopAnimations",
		hide_images: "hideImages",
	};
	const ENABLED = new Set(Object.keys(FEATURES).filter((k) => enabledFeatures.has(k)).map((k) => FEATURES[k]));

	// Birbirini dışlayan seçenekler
	const EXCLUSIVE = { contrast: "darkMode", darkMode: "contrast", readingMask: "readingGuide", readingGuide: "readingMask" };

	// Sayfaya sınıfla uygulanan özellikler (stilleri page.css'te)
	const CLASSES = {
		contrast: "gk-contrast",
		darkMode: "gk-dark",
		grayscale: "gk-gray",
		readableFont: "gk-font",
		highlightLinks: "gk-links",
		bigCursor: "gk-cursor",
		stopAnimations: "gk-noanim",
		hideImages: "gk-noimg",
	};

	// ---------- yardımcılar ----------
	const SVG_NS = "http://www.w3.org/2000/svg";

	/** HTML öğesi kurar. "text" anahtarı textContent'e yazılır; çocuklar düğüm ya da düz metindir. */
	function h(tag, attrs, ...children) {
		const node = doc.createElement(tag);
		for (const [key, value] of Object.entries(attrs || {})) {
			if (key === "text") node.textContent = value;
			else if (value === true) node.setAttribute(key, "");
			else if (value !== false && value != null) node.setAttribute(key, String(value));
		}
		for (const child of children) if (child != null && child !== false) node.append(child);
		return node;
	}

	function s(tag, attrs) {
		const node = doc.createElementNS(SVG_NS, tag);
		for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
		return node;
	}

	const LINE = { fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" };
	const path = (d, extra) => s("path", Object.assign({ d }, LINE, extra || {}));

	/** Düz çizgi simgeleri (24×24). */
	function icon(name) {
		const svg = s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", class: "gk-icon" });
		const add = (...nodes) => nodes.forEach((n) => svg.append(n));
		const text = (x, y, size, value) => {
			const t = s("text", { x, y, "text-anchor": "middle", "font-size": size, "font-weight": 700, "font-family": "system-ui, sans-serif", fill: "currentColor" });
			t.textContent = value;
			return t;
		};
		switch (name) {
			case "person":
				add(
					s("circle", { cx: 12, cy: 12, r: 10.25, fill: "none", stroke: "currentColor", "stroke-width": "1.5" }),
					s("circle", { cx: 12, cy: 6.7, r: 1.7, fill: "currentColor" }),
					path("M6.6 9.4l5.4 1.1 5.4-1.1M12 10.5v3.5M12 14l-2.6 4.6M12 14l2.6 4.6")
				);
				break;
			case "eye":
				add(path("M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"), s("circle", { cx: 12, cy: 12, r: 3, fill: "currentColor" }));
				break;
			case "text":
				add(text(12, 16.5, 12, "Aa"));
				break;
			case "close":
				add(path("M6 6l12 12M18 6L6 18", { "stroke-width": "2" }));
				break;
			case "lineHeight":
				add(path("M10 6h10M10 12h10M10 18h10M4 5v14M2.5 7L4 5l1.5 2M2.5 17L4 19l1.5-2"));
				break;
			case "letterSpacing":
				add(text(7, 13, 9, "A"), text(17, 13, 9, "B"), path("M4 18h16M6 16.5L4 18l2 1.5M18 16.5l2 1.5-2 1.5"));
				break;
			case "contrast":
				add(s("circle", { cx: 12, cy: 12, r: 8.5, fill: "none", stroke: "currentColor", "stroke-width": "1.8" }), s("path", { d: "M12 3.5a8.5 8.5 0 0 1 0 17z", fill: "currentColor" }));
				break;
			case "darkMode":
				add(path("M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"));
				break;
			case "grayscale":
				add(path("M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"), s("path", { d: "M12 20a6 6 0 0 1-6-6c0-2 1.6-4.7 3.2-6.8L12 20z", fill: "currentColor" }));
				break;
			case "readableFont":
				add(text(12, 16.5, 12, "Aa"), path("M4 20h16", { "stroke-width": "1.5" }));
				break;
			case "highlightLinks":
				add(path("M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"));
				break;
			case "bigCursor":
				add(path("M6 3l11 10.5-5 .7 3 5.8-2.4 1.2-3-5.8L6 18.5z"));
				break;
			case "readingMask":
				add(s("rect", { x: 3, y: 4, width: 18, height: 16, rx: 2, fill: "none", stroke: "currentColor", "stroke-width": "1.8" }), s("rect", { x: 3, y: 4, width: 18, height: 5, fill: "currentColor", opacity: ".45" }), s("rect", { x: 3, y: 15, width: 18, height: 5, fill: "currentColor", opacity: ".45" }));
				break;
			case "readingGuide":
				add(path("M3 12h18", { "stroke-width": "3" }), path("M3 7h6M3 17h9M14 7h7M15 17h6", { "stroke-width": "1.4", opacity: ".6" }));
				break;
			case "stopAnimations":
				add(s("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": "1.8" }), path("M10 8.5v7M14 8.5v7", { "stroke-width": "2.2" }));
				break;
			case "hideImages":
				add(s("rect", { x: 3, y: 5, width: 18, height: 14, rx: 2, fill: "none", stroke: "currentColor", "stroke-width": "1.8" }), path("M3 16l5-5 4 4 3-3 6 6"), path("M3 3l18 18", { "stroke-width": "2" }));
				break;
			default:
				break;
		}
		return svg;
	}

	/** Düğme renginin üstünde en okunaklı olan yazı rengi (siyah ya da beyaz). */
	function inkFor(hex) {
		const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || "");
		if (!m) return "#ffffff";
		let v = m[1];
		if (v.length === 3) v = v.split("").map((c) => c + c).join("");
		const lin = [0, 2, 4].map((i) => {
			const c = parseInt(v.slice(i, i + 2), 16) / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
		return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#000000";
	}

	// ---------- tercihler ----------
	const STORE = "gozkulak:v1";
	const DEFAULTS = {
		fontSize: 0,
		lineHeight: 0,
		letterSpacing: 0,
		contrast: false,
		darkMode: false,
		grayscale: false,
		readableFont: false,
		highlightLinks: false,
		bigCursor: false,
		readingMask: false,
		readingGuide: false,
		stopAnimations: false,
		hideImages: false,
	};
	const MAX = { fontSize: FONT_STEPS.length - 1, lineHeight: LEVELS - 1, letterSpacing: LEVELS - 1 };

	function cleanPrefs(raw) {
		const out = Object.assign({}, DEFAULTS);
		if (!raw || typeof raw !== "object") return out;
		for (const key of Object.keys(DEFAULTS)) {
			if (!ENABLED.has(key) || !(key in raw)) continue;
			if (typeof DEFAULTS[key] === "number") {
				const n = Math.round(Number(raw[key]));
				if (Number.isFinite(n)) out[key] = Math.max(0, Math.min(MAX[key], n));
			} else {
				out[key] = raw[key] === true;
			}
		}
		if (out.contrast && out.darkMode) out.darkMode = false;
		if (out.readingMask && out.readingGuide) out.readingGuide = false;
		return out;
	}

	function loadPrefs() {
		try {
			const raw = window.localStorage.getItem(STORE);
			return cleanPrefs(raw ? JSON.parse(raw) : null);
		} catch (e) {
			return Object.assign({}, DEFAULTS);
		}
	}

	const isDefault = (p) => Object.keys(DEFAULTS).every((k) => p[k] === DEFAULTS[k]);

	function savePrefs() {
		try {
			if (isDefault(prefs)) window.localStorage.removeItem(STORE);
			else window.localStorage.setItem(STORE, JSON.stringify(prefs));
		} catch (e) {
			// Gizli pencere ya da kapalı depolama: tercihler yalnızca bu sayfada geçerli kalır.
		}
	}

	let prefs = loadPrefs();

	// ---------- sayfa stilleri (yalnızca gerektiğinde yüklenir) ----------
	let pageCss = null;
	function ensurePageCss() {
		if (pageCss || !cfg.pageCss) return;
		pageCss = h("link", { rel: "stylesheet", id: "gozkulak-page-css", href: cfg.pageCss });
		doc.head.append(pageCss);
	}

	// Satır aralığı düzeyleri ve kapsamı (page.css ile aynı): yalnızca metin blokları, site başlığı ve menü hariç
	const LH_VALUES = [0, 1.75, 2.2];
	const TEXT_SEL = "p, li, dt, dd, td, th, caption, blockquote, figcaption, label, address, pre, h1, h2, h3, h4, h5, h6";
	const HEADER_SEL = 'header, nav, [role="banner"], [role="navigation"], #Header_wrapper, #Header_creative, #Top_bar, #masthead, .lhb-frontend-header, .elementor-location-header';

	/**
	 * Ölçümü GözKulak'ın sayfa sınıfları kaldırılmışken yapar; böylece sitenin özgün değerleri okunur.
	 * Sınıflar aynı görev içinde geri eklendiği için ekranda bir değişiklik görünmez.
	 */
	function measureOriginal(fn) {
		const ours = [...htmlEl.classList].filter((c) => c.startsWith("gk-"));
		if (ours.length) htmlEl.classList.remove(...ours);
		try {
			return fn();
		} finally {
			if (ours.length) htmlEl.classList.add(...ours);
		}
	}

	// ---------- yazı boyutu: metin içeren öğelerin özgün boyutu kaydedilip ölçeklenir ----------
	const fontScale = (() => {
		const XHTML = "http://www.w3.org/1999/xhtml";
		const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "CANVAS", "VIDEO", "AUDIO", "IMG", "PICTURE", "BR", "HR", "GOZKULAK-ROOT", "GOZKULAK-OVERLAY"]);
		const FORM = /^(INPUT|TEXTAREA|SELECT|BUTTON)$/;
		const records = new Map();
		let factor = 1;
		let lineLevel = 0;
		let observer = null;

		const usable = (el) => el.namespaceURI === XHTML && !SKIP.has(el.tagName);
		const hasText = (el) => {
			for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
			return FORM.test(el.tagName);
		};
		const px = (value) => {
			const n = parseFloat(value);
			return Number.isFinite(n) ? n : null;
		};

		function collect(root, out) {
			if (root.nodeType !== 1 || !usable(root)) return;
			if (hasText(root)) out.push(root);
			const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
				acceptNode: (n) => (usable(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
			});
			let n;
			while ((n = walker.nextNode())) if (hasText(n)) out.push(n);
		}

		function remember(el, size, lh) {
			const st = el.style;
			records.set(el, {
				px: size,
				lh,
				text: !el.closest(HEADER_SEL) && !!el.closest(TEXT_SEL),
				fs: st.getPropertyValue("font-size"),
				fsPrio: st.getPropertyPriority("font-size"),
				lhInline: st.getPropertyValue("line-height"),
				lhPrio: st.getPropertyPriority("line-height"),
			});
		}

		function restoreLineHeight(el, rec) {
			if (rec.lhInline) el.style.setProperty("line-height", rec.lhInline, rec.lhPrio);
			else el.style.removeProperty("line-height");
		}

		/**
		 * Yazı büyürken px cinsinden verilmiş satır yüksekliği de büyütülür (satırlar üst üste binmesin).
		 * Menü ve logo gibi dikey ortalama için verilmiş büyük satır yükseklikleri (yazının 2 katından
		 * fazlası) yalnızca yazı sığmayacaksa büyür; böylece site başlığının yüksekliği değişmez.
		 * Satır aralığı özelliği açıksa metin bloklarında onun değeri kullanılır.
		 */
		function lineHeightFor(rec) {
			if (rec.lh / rec.px <= 2) return rec.lh * factor;
			return Math.max(rec.lh, rec.px * factor * 1.3);
		}

		function apply(el, rec) {
			el.style.setProperty("font-size", (rec.px * factor).toFixed(2) + "px", "important");
			if (lineLevel > 0 && rec.text) el.style.setProperty("line-height", String(LH_VALUES[lineLevel]), "important");
			else if (rec.lh) el.style.setProperty("line-height", lineHeightFor(rec).toFixed(2) + "px", "important");
			else restoreLineHeight(el, rec);
		}

		function restore(el, rec) {
			if (rec.fs) el.style.setProperty("font-size", rec.fs, rec.fsPrio);
			else el.style.removeProperty("font-size");
			restoreLineHeight(el, rec);
		}

		/** Sonradan eklenen öğeler: boyutu ölçeklenmiş bir üst öğeden miras alıyorsa özgün boyut o üst öğeninkidir. */
		function onMutations(list) {
			if (factor === 1) return;
			const added = [];
			for (const m of list) for (const node of m.addedNodes) collect(node, added);
			const fresh = added.filter((el) => !records.has(el));
			if (!fresh.length) return;
			const measured = fresh.map((el) => {
				const cs = getComputedStyle(el);
				const size = px(cs.fontSize) || 16;
				let a = el.parentElement;
				while (a && !records.has(a)) a = a.parentElement;
				const rec = a && records.get(a);
				if (rec && Math.abs(size - rec.px * factor) < 0.5) return [rec.px, rec.lh];
				return [size, px(cs.lineHeight)];
			});
			fresh.forEach((el, i) => {
				remember(el, measured[i][0], measured[i][1]);
				apply(el, records.get(el));
			});
		}

		function set(next, level) {
			if (next === factor && level === lineLevel) return;
			if (factor === 1 && next !== 1) {
				// İlk ölçeklemeden önce tüm özgün değerler okunur; yoksa miras alınan boyutlar katlanır.
				const targets = [];
				collect(doc.body, targets);
				const values = measureOriginal(() => targets.map((el) => {
					const cs = getComputedStyle(el);
					return [px(cs.fontSize) || 16, px(cs.lineHeight)];
				}));
				targets.forEach((el, i) => remember(el, values[i][0], values[i][1]));
			}
			factor = next;
			lineLevel = level;
			if (factor === 1) {
				for (const [el, rec] of records) restore(el, rec);
				records.clear();
				if (observer) observer.disconnect();
				observer = null;
				return;
			}
			for (const [el, rec] of records) apply(el, rec);
			if (!observer) {
				observer = new MutationObserver(onMutations);
				observer.observe(doc.body, { childList: true, subtree: true });
			}
		}

		return { set };
	})();

	/*
	 * ---------- sayfa işaretleri ----------
	 * Koyu mod: CSS ile verilmiş arka plan görselleri (ör. Elementor bölümleri) gk-bgimg ile işaretlenir
	 * ve tekrar çevrilerek özgün renklerinde kalır.
	 * Yüksek kontrast: zemini saydam olan öğeler gk-c0, yarı saydam katmanlar gk-c1 alır; böylece
	 * manşet görselleri ve slaytların üstündeki katmanlar opak siyaha dönüp görseli örtmez.
	 * Sayfanın tamamını saran zemin desenleri (gk-cbg) yüksek kontrastta kaldırılır.
	 */
	const marks = (() => {
		const XHTML = "http://www.w3.org/1999/xhtml";
		const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META", "BR", "GOZKULAK-ROOT", "GOZKULAK-OVERLAY"]);
		const OURS = ["gk-bgimg", "gk-c0", "gk-c1", "gk-cbg"];
		const marked = new Set();
		let wantImages = false;
		let wantColors = false;
		let observer = null;
		let pending = new Map();
		let timer = 0;
		let lateTimer = 0;

		const usable = (el) => el.namespaceURI === XHTML && !SKIP.has(el.tagName);

		function alphaOf(color) {
			if (!color || color === "transparent") return 0;
			const slash = /\/\s*([\d.]+)(%?)\s*\)\s*$/.exec(color);
			if (slash) return parseFloat(slash[1]) / (slash[2] ? 100 : 1);
			const m = /^rgba?\(([^)]*)\)$/.exec(color);
			if (!m) return 1;
			const parts = m[1].split(/[\s,]+/).filter(Boolean);
			return parts.length >= 4 ? parseFloat(parts[3]) : 1;
		}

		function elementsOf(root, deep, out) {
			if (root.nodeType !== 1 || !usable(root)) return;
			out.push(root);
			if (!deep) return;
			const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
				acceptNode: (n) => (usable(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
			});
			let n;
			while ((n = walker.nextNode())) out.push(n);
		}

		function scan(list) {
			if (!list.length) return;
			// Özgün değerler okunur, sonra işaretler tek seferde yazılır.
			const found = measureOriginal(() => {
				const root = doc.documentElement;
				// Sayfanın tamamını saran zemin desenleri görsel sayılmaz; yoksa koyu mod tüm sayfada geri alınır.
				const wrapper = (el) => {
					if (el === doc.body) return true;
					const r = el.getBoundingClientRect();
					return r.height >= 0.75 * root.scrollHeight && r.width >= 0.9 * root.clientWidth;
				};
				return list.map((el) => {
					const cs = getComputedStyle(el);
					const url = /url\(/.test(cs.backgroundImage);
					const page = url && wrapper(el);
					return [url && !page, page, alphaOf(cs.backgroundColor)];
				});
			});
			list.forEach((el, i) => {
				const [image, page, alpha] = found[i];
				const add = [];
				if (wantImages && image) add.push("gk-bgimg");
				if (wantColors && page) add.push("gk-cbg");
				if (wantColors && alpha === 0) add.push("gk-c0");
				if (wantColors && alpha > 0 && alpha < 1) add.push("gk-c1");
				for (const c of OURS) if (!add.includes(c) && el.classList.contains(c)) el.classList.remove(c);
				if (add.length) {
					for (const c of add) if (!el.classList.contains(c)) el.classList.add(c);
					marked.add(el);
				} else {
					marked.delete(el);
				}
			});
		}

		function full() {
			const list = [];
			elementsOf(doc.body, true, list);
			scan(list);
		}

		function flush() {
			timer = 0;
			const list = [];
			for (const [node, deep] of pending) elementsOf(node, deep, list);
			pending = new Map();
			scan(list);
		}

		const ourClassesOnly = (oldValue, el) => {
			const strip = (v) => (v || "").split(/\s+/).filter((c) => c && !OURS.includes(c)).sort().join(" ");
			return strip(oldValue) === strip(el.getAttribute("class"));
		};

		function onMutations(list) {
			for (const m of list) {
				if (m.type === "childList") {
					for (const node of m.addedNodes) if (node.nodeType === 1) pending.set(node, true);
				} else if (!ourClassesOnly(m.oldValue, m.target)) {
					// Sınıfı değişen öğenin yalnızca kendisi yeniden ölçülür (ör. gecikmeli yüklenen arka plan).
					if (!pending.has(m.target)) pending.set(m.target, false);
				}
			}
			if (pending.size && !timer) timer = window.setTimeout(flush, 250);
		}

		function set(images, colors) {
			if (images === wantImages && colors === wantColors) return;
			wantImages = images;
			wantColors = colors;
			if (!images && !colors) {
				if (observer) observer.disconnect();
				observer = null;
				window.clearTimeout(timer);
				window.clearTimeout(lateTimer);
				timer = 0;
				for (const el of marked) el.classList.remove(...OURS);
				marked.clear();
				return;
			}
			pending = new Map();
			full();
			if (!observer) {
				observer = new MutationObserver(onMutations);
				observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
			}
			// Sayfa yüklendikten sonra devreye giren slaytlar ve gecikmeli görseller için bir kez daha
			window.clearTimeout(lateTimer);
			lateTimer = window.setTimeout(() => {
				if (wantImages || wantColors) full();
			}, 1500);
		}

		return { set };
	})();

	// ---------- okuma maskesi ve cetveli: ayrı bir katman, imleci ve klavye odağını izler ----------
	const overlay = (() => {
		const BAND = 140;
		let host = null;
		let top;
		let bottom;
		let guide;
		let mode = null;
		let y = window.innerHeight / 2;
		let frame = 0;

		function build() {
			host = doc.createElement("gozkulak-overlay");
			const st = host.style;
			st.setProperty("position", "fixed");
			st.setProperty("inset", "0");
			st.setProperty("z-index", "2147482999");
			st.setProperty("pointer-events", "none");
			st.setProperty("margin", "0");
			st.setProperty("padding", "0");
			st.setProperty("display", "block");
			const root = host.attachShadow({ mode: "open" });
			top = h("div", { class: "gk-mask gk-mask-top" });
			bottom = h("div", { class: "gk-mask gk-mask-bottom" });
			guide = h("div", { class: "gk-guide" });
			root.append(h("link", { rel: "stylesheet", href: cfg.css }), top, bottom, guide);
		}

		function draw() {
			frame = 0;
			if (!host) return;
			top.style.height = Math.max(0, y - BAND / 2) + "px";
			bottom.style.top = Math.max(0, y + BAND / 2) + "px";
			guide.style.top = Math.max(0, y - 5) + "px";
		}

		function moveTo(next) {
			y = Math.max(0, Math.min(window.innerHeight, next));
			if (!frame) frame = window.requestAnimationFrame(draw);
		}

		const onPointer = (e) => moveTo(e.clientY);
		const onTouch = (e) => {
			if (e.touches && e.touches[0]) moveTo(e.touches[0].clientY);
		};
		const onFocus = (e) => {
			const target = e.composedPath ? e.composedPath()[0] : e.target;
			if (!target || !target.getBoundingClientRect || (rootHost && rootHost.contains(target))) return;
			const r = target.getBoundingClientRect();
			moveTo(r.top + r.height / 2);
		};

		function set(next) {
			if (next === mode) return;
			mode = next;
			if (!mode) {
				if (host) host.remove();
				doc.removeEventListener("pointermove", onPointer);
				doc.removeEventListener("touchmove", onTouch);
				doc.removeEventListener("focusin", onFocus);
				return;
			}
			if (!host) build();
			top.hidden = bottom.hidden = mode !== "mask";
			guide.hidden = mode !== "guide";
			if (!host.isConnected) doc.body.append(host);
			doc.addEventListener("pointermove", onPointer, { passive: true });
			doc.addEventListener("touchmove", onTouch, { passive: true });
			doc.addEventListener("focusin", onFocus);
			draw();
		}

		return { set };
	})();

	// ---------- animasyonlar: CSS page.css'te; oynayan videolar duraklatılır ----------
	const media = (() => {
		const paused = new Set();
		return {
			set(on) {
				if (on) {
					for (const v of doc.querySelectorAll("video")) {
						if (!v.paused) {
							v.pause();
							paused.add(v);
						}
					}
				} else {
					for (const v of paused) {
						const p = v.play();
						if (p && p.catch) p.catch(() => {});
					}
					paused.clear();
				}
			},
		};
	})();

	// ---------- tercihleri sayfaya uygula ----------
	function applyAll() {
		const needCss = prefs.lineHeight > 0 || prefs.letterSpacing > 0 || Object.keys(CLASSES).some((k) => prefs[k]);
		if (needCss) ensurePageCss();
		for (const [key, cls] of Object.entries(CLASSES)) htmlEl.classList.toggle(cls, !!prefs[key]);
		htmlEl.classList.toggle("gk-lh1", prefs.lineHeight === 1);
		htmlEl.classList.toggle("gk-lh2", prefs.lineHeight === 2);
		htmlEl.classList.toggle("gk-ls1", prefs.letterSpacing === 1);
		htmlEl.classList.toggle("gk-ls2", prefs.letterSpacing === 2);
		marks.set(!!prefs.darkMode, !!prefs.contrast);
		fontScale.set(FONT_STEPS[prefs.fontSize], prefs.lineHeight);
		overlay.set(prefs.readingMask ? "mask" : prefs.readingGuide ? "guide" : null);
		media.set(prefs.stopAnimations);
	}

	// ---------- kök öğe: kritik konum stilleri satır içi (tema seçicileri ezemesin) ----------
	const position = ["bottom-right", "bottom-left", "middle-right", "middle-left"].includes(cfg.position) ? cfg.position : "bottom-right";
	const offset = Array.isArray(cfg.offset) ? cfg.offset : [20, 20];
	const x = Math.max(0, Math.min(200, Number(offset[0]) || 0)) + "px";
	const yOff = Math.max(0, Math.min(200, Number(offset[1]) || 0)) + "px";
	const size = Math.max(44, Math.min(80, Number(cfg.size) || 56));
	const color = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(cfg.color || "") ? cfg.color : "#085e9d";

	const rootHost = doc.createElement("gozkulak-root");
	rootHost.setAttribute("data-position", position);
	const hs = rootHost.style;
	hs.setProperty("display", "none");
	hs.setProperty("position", "fixed");
	hs.setProperty("z-index", "2147483000");
	hs.setProperty("margin", "0");
	hs.setProperty("padding", "0");
	hs.setProperty("--gk-size", size + "px");
	hs.setProperty("--gk-color", color);
	hs.setProperty("--gk-ink", inkFor(color));
	if (position.endsWith("right")) hs.setProperty("right", x);
	else hs.setProperty("left", x);
	if (position.startsWith("bottom")) {
		hs.setProperty("bottom", yOff);
	} else {
		hs.setProperty("top", "50%");
		hs.setProperty("transform", "translateY(-50%)");
	}

	const shadow = rootHost.attachShadow({ mode: "open" });
	const sheet = h("link", { rel: "stylesheet", href: cfg.css });
	sheet.addEventListener("load", () => hs.removeProperty("display"));
	sheet.addEventListener("error", () => {
		// Stil yüklenemezse biçimsiz bir düğme göstermektense menüyü gizli tutar.
		if (window.console) console.warn("GözKulak: menü stili yüklenemedi.");
	});

	// ---------- panel ----------
	const live = h("div", { class: "gk-sr", role: "status", "aria-live": "polite" });
	let liveTimer = 0;
	function announce(message) {
		live.textContent = "";
		window.clearTimeout(liveTimer);
		liveTimer = window.setTimeout(() => {
			live.textContent = message;
		}, 60);
	}

	const controls = {};

	function tile(key, iconName, label) {
		const multi = typeof DEFAULTS[key] === "number";
		const state = h("span", { class: "gk-tile-state" });
		const btn = h("button", { type: "button", class: "gk-tile", "aria-pressed": "false" },
			h("span", { class: "gk-tile-icon" }, icon(iconName)),
			h("span", { class: "gk-tile-label", text: label }),
			state);
		btn.addEventListener("click", () => {
			if (multi) {
				prefs[key] = (prefs[key] + 1) % LEVELS;
				update(key);
				announce(label + ": " + STR.levels[prefs[key]]);
			} else {
				prefs[key] = !prefs[key];
				if (prefs[key] && EXCLUSIVE[key]) prefs[EXCLUSIVE[key]] = false;
				update(key);
				announce(label + " " + (prefs[key] ? STR.stateOn : STR.stateOff));
			}
		});
		controls[key] = {
			render() {
				const value = prefs[key];
				btn.setAttribute("aria-pressed", value ? "true" : "false");
				state.textContent = multi ? STR.levels[value] : value ? STR.on : STR.off;
			},
		};
		return btn;
	}

	function fontStepper() {
		const value = h("span", { class: "gk-step-value", "aria-hidden": "true" });
		const down = h("button", { type: "button", class: "gk-step-btn", "aria-label": STR.fontDown }, "A−");
		const up = h("button", { type: "button", class: "gk-step-btn gk-step-up", "aria-label": STR.fontUp }, "A+");
		const percent = () => "%" + Math.round(FONT_STEPS[prefs.fontSize] * 100);
		const change = (delta) => {
			const next = Math.max(0, Math.min(MAX.fontSize, prefs.fontSize + delta));
			if (next === prefs.fontSize) return;
			prefs.fontSize = next;
			update("fontSize");
			announce(STR.fontSize + " " + percent());
		};
		down.addEventListener("click", () => change(-1));
		up.addEventListener("click", () => change(1));
		controls.fontSize = {
			render() {
				value.textContent = percent();
				down.disabled = prefs.fontSize === 0;
				up.disabled = prefs.fontSize === MAX.fontSize;
			},
		};
		return h("div", { class: "gk-step", role: "group", "aria-labelledby": "gk-fs-label" },
			h("span", { id: "gk-fs-label", class: "gk-step-label", text: STR.fontSize }),
			h("span", { class: "gk-step-controls" }, down, value, up));
	}

	const GROUPS = [
		{ id: "vision", label: STR.vision, tiles: [["lineHeight", "lineHeight"], ["letterSpacing", "letterSpacing"], ["contrast", "contrast"], ["darkMode", "darkMode"], ["grayscale", "grayscale"], ["readableFont", "readableFont"], ["highlightLinks", "highlightLinks"], ["bigCursor", "bigCursor"]] },
		{ id: "reading", label: STR.reading, tiles: [["readingMask", "readingMask"], ["readingGuide", "readingGuide"], ["stopAnimations", "stopAnimations"], ["hideImages", "hideImages"]] },
	];

	const body = h("div", { class: "gk-body" });
	if (cfg.testMode) body.append(h("p", { class: "gk-test", text: STR.test }));
	for (const group of GROUPS) {
		const items = group.tiles.filter(([key]) => ENABLED.has(key));
		const hasFont = group.id === "vision" && ENABLED.has("fontSize");
		if (!items.length && !hasFont) continue;
		const headingId = "gk-g-" + group.id;
		const section = h("section", { class: "gk-group", "aria-labelledby": headingId }, h("h3", { id: headingId, class: "gk-group-title", text: group.label }));
		if (hasFont) section.append(fontStepper());
		if (items.length) {
			const grid = h("div", { class: "gk-grid" });
			for (const [key, iconName] of items) grid.append(tile(key, iconName, STR[key]));
			section.append(grid);
		}
		body.append(section);
	}

	const resetButton = h("button", { type: "button", class: "gk-reset" }, STR.reset);
	resetButton.addEventListener("click", () => {
		prefs = Object.assign({}, DEFAULTS);
		update(null);
		announce(STR.resetDone);
	});
	const foot = h("div", { class: "gk-foot" }, resetButton, h("span", { class: "gk-hint", text: STR.shortcut + ": " + SHORTCUT.label }));

	const button = h("button", {
		type: "button",
		class: "gk-btn",
		"aria-label": STR.open,
		"aria-expanded": "false",
		"aria-controls": "gk-panel",
		"aria-keyshortcuts": "Alt+Shift+G",
	}, icon(["person", "eye", "text"].includes(cfg.icon) ? cfg.icon : "person"));

	const title = h("h2", { id: "gk-title", class: "gk-title", tabindex: "-1", text: STR.title });
	const closeButton = h("button", { type: "button", class: "gk-close", "aria-label": STR.close }, icon("close"));
	const panel = h("div", {
		id: "gk-panel",
		class: "gk-panel",
		role: "dialog",
		"aria-labelledby": "gk-title",
		hidden: true,
	}, h("div", { class: "gk-head" }, title, closeButton), body, foot);

	function render() {
		for (const c of Object.values(controls)) c.render();
		resetButton.disabled = isDefault(prefs);
	}

	function update() {
		applyAll();
		render();
		savePrefs();
	}

	const isOpen = () => !panel.hidden;

	function open() {
		panel.hidden = false;
		button.setAttribute("aria-expanded", "true");
		title.focus();
	}

	function close(returnFocus) {
		if (!isOpen()) return;
		panel.hidden = true;
		button.setAttribute("aria-expanded", "false");
		if (returnFocus) button.focus();
	}

	button.addEventListener("click", () => (isOpen() ? close(false) : open()));
	closeButton.addEventListener("click", () => close(true));
	panel.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			close(true);
		}
	});
	doc.addEventListener("pointerdown", (e) => {
		if (isOpen() && !e.composedPath().includes(rootHost)) close(false);
	});
	doc.addEventListener("keydown", (e) => {
		if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === SHORTCUT.code) {
			e.preventDefault();
			if (isOpen()) close(true);
			else open();
		}
	});

	shadow.append(sheet, panel, button, live);

	// Kayıtlı tercihler sayfa açılır açılmaz uygulanır.
	const start = () => {
		doc.body.append(rootHost);
		applyAll();
		render();
		window.GozKulak = {
			version: cfg.version,
			open,
			close: () => close(false),
			reset: () => resetButton.click(),
		};
	};
	if (doc.body) start();
	else doc.addEventListener("DOMContentLoaded", start, { once: true });
})();

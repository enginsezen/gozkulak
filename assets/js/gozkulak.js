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

	// Satır aralığı düzeyleri ve kapsamı (page.css ile aynı): yalnızca metin blokları, site başlığı ve menü hariç.
	// Büyük puntolu başlıklarda daha küçük değerler kullanılır; yoksa satırlar birbirinden kopuk görünür.
	const LH_VALUES = [0, 1.75, 2.2];
	const LH_HEADING = [0, 1.45, 1.7];
	const HEADING_SEL = "h1, h2, h3, h4, h5, h6";
	const TEXT_SEL = "p, li, dt, dd, td, th, caption, blockquote, figcaption, label, address, pre, " + HEADING_SEL;
	const HEADER_SEL = 'header, nav, [role="banner"], [role="navigation"], #Header_wrapper, #Header_creative, #Top_bar, #masthead, .lhb-frontend-header, .elementor-location-header';

	/**
	 * Çalışma zamanı stil sayfası: renk kuralları ve ölçüm sırasında geçiş efektlerini kapatan kural.
	 * Oluşturulabilir stil sayfası (adoptedStyleSheets) CSP'nin satır içi stil kısıtına takılmaz;
	 * desteklenmeyen tarayıcıda boş bir <style> öğesine CSSOM ile kural eklenir.
	 */
	const runtime = (() => {
		let sheet;
		function init() {
			try {
				const created = new CSSStyleSheet();
				doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, created];
				return created;
			} catch (e) {
				const el = h("style", { id: "gozkulak-runtime" });
				doc.head.append(el);
				return el.sheet || null;
			}
		}
		function insert(text) {
			if (!sheet) return false;
			try {
				sheet.insertRule(text, sheet.cssRules.length);
				return true;
			} catch (e) {
				return false;
			}
		}
		function ensure() {
			if (sheet !== undefined) return;
			sheet = init();
			insert("html.gk-measure *, html.gk-measure *::before, html.gk-measure *::after, .gk-pm, .gk-pm::before, .gk-pm::after { transition: none !important; }");
		}
		return {
			ensure,
			add(text) {
				ensure();
				return insert(text);
			},
		};
	})();

	/**
	 * Ölçümü GözKulak'ın sayfa sınıfları kaldırılmışken yapar; böylece sitenin özgün değerleri okunur.
	 * Ölçüm boyunca geçiş efektleri kapalıdır: açık olsalardı tarayıcı geçişin başlangıç değerini (yani
	 * GözKulak'ın rengini) döndürürdü. Sınıflar geri eklendikten sonra stil bir kez daha hesaplanır;
	 * böylece ekranda hiçbir geçiş tetiklenmez ve görünür bir değişiklik olmaz.
	 */
	function measureOriginal(fn) {
		runtime.ensure();
		const ours = [...htmlEl.classList].filter((c) => c.startsWith("gk-"));
		htmlEl.classList.add("gk-measure");
		if (ours.length) htmlEl.classList.remove(...ours);
		try {
			return fn();
		} finally {
			if (ours.length) htmlEl.classList.add(...ours);
			void htmlEl.offsetWidth;
			htmlEl.classList.remove("gk-measure");
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
			const text = !el.closest(HEADER_SEL) && !!el.closest(TEXT_SEL);
			records.set(el, {
				px: size,
				lh,
				text,
				heading: text && !!el.closest(HEADING_SEL),
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
			if (lineLevel > 0 && rec.text) el.style.setProperty("line-height", String((rec.heading ? LH_HEADING : LH_VALUES)[lineLevel]), "important");
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
	 * ---------- sayfa boyama: yüksek kontrast ve koyu mod ----------
	 * Görsellere filtre uygulanmaz; fotoğraflar, slaytlar, videolar ve logolar özgün renklerinde kalır.
	 * Yalnızca öğelerin zemin, yazı, kenarlık ve simge renkleri değiştirilir: her öğenin özgün renkleri
	 * okunur, dönüştürülür ve ortak sınıflar (gk-p…) olarak çalışma zamanı stil sayfasına yazılır.
	 * Öğelere satır içi stil yazılmaz.
	 *
	 * Yüksek kontrast: opak zeminler siyah, yazılar beyaz (page.css). Betik ayrıca şunları ekler:
	 *   gk-cimg  fotoğraf zemini korunur
	 *   gk-c0    saydam zemin saydam kalır (alttaki görsel örtülmez)
	 *   gk-p…    yarı saydam katmanlar ve renk geçişleri aynı saydamlıkta siyaha döner
	 * Koyu mod: açık zeminler koyulaşır, koyu yazılar açılır; renk tonu korunur. Fotoğraf zeminli
	 * alanlardaki yarı saydam katmanlara ve yazılara dokunulmaz (tasarım görselle birlikte kalır).
	 */
	const paint = (() => {
		const XHTML = "http://www.w3.org/1999/xhtml";
		const SVGNS = "http://www.w3.org/2000/svg";
		const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META", "BR", "GOZKULAK-ROOT", "GOZKULAK-OVERLAY"]);
		const isPaintClass = (c) => c === "gk-c0" || c === "gk-cimg" || c.startsWith("gk-p");
		const marked = new Set();
		const effOf = new WeakMap();
		const palette = new Map();
		let serial = 0;
		let mode = null;
		let observer = null;
		let pending = new Map();
		let timer = 0;
		let lateTimer = 0;
		let hoverTimer = 0;
		const hoverTargets = new Set();
		const page = { h: 0, w: 0 };

		// ---- renk yardımcıları ----
		const COLOR_RE = /rgba?\([^()]*\)/g;

		function parse(str) {
			if (!str) return null;
			if (str === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
			const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/.exec(str);
			if (!m) return null;
			const a = m[4] === undefined ? 1 : parseFloat(m[4]) / (m[5] ? 100 : 1);
			return { r: +m[1], g: +m[2], b: +m[3], a };
		}

		const fmt = (c) => (c.a >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.round(c.a * 1000) / 1000})`);
		const luma = (c) => (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;

		function toHsl(c) {
			const r = c.r / 255;
			const g = c.g / 255;
			const b = c.b / 255;
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const l = (max + min) / 2;
			let hue = 0;
			let sat = 0;
			if (max !== min) {
				const d = max - min;
				sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
				else if (max === g) hue = (b - r) / d + 2;
				else hue = (r - g) / d + 4;
				hue /= 6;
			}
			return { hue, sat, l };
		}

		function fromHsl(hue, sat, l, a) {
			const k = (n) => (n + hue * 12) % 12;
			const ch = (n) => Math.round(255 * (l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
			return { r: ch(0), g: ch(8), b: ch(4), a };
		}

		/** Gradyan ya da gölge dizesindeki her rengi dönüştürür; dönüştürülemeyen renk aynen kalır. */
		const mapColors = (str, fn) => str.replace(COLOR_RE, (m) => {
			const c = parse(m);
			const t = c && fn(c);
			return t ? fmt(t) : m;
		});

		const black = (c) => ({ r: 0, g: 0, b: 0, a: c.a });

		/** Koyu mod zemini: açık renkler koyulaşır; zaten koyu olanlar ve marka renkleri (düğme, şerit) kalır. */
		function darkBg(c) {
			if (c.a === 0) return null;
			const y = luma(c);
			if (y <= 0.3) return null;
			const { hue, sat, l } = toHsl(c);
			if (sat >= 0.4 && y <= 0.7 && l <= 0.7) return null;
			return fromHsl(hue, Math.min(sat, 0.55), 0.08 + (1 - l) * 0.35, c.a);
		}

		/** Koyu mod yazısı ve simgesi: koyu renkler açılır, ton korunur. */
		function darkInk(c) {
			if (c.a === 0 || luma(c) >= 0.55) return null;
			const { hue, sat, l } = toHsl(c);
			let target = Math.min(0.9, 0.95 - l * 0.5);
			let out = fromHsl(hue, sat, target, c.a);
			while (luma(out) < 0.6 && target < 0.95) {
				target += 0.03;
				out = fromHsl(hue, sat, target, c.a);
			}
			return out;
		}

		/** Koyu mod kenarlığı: açık çizgiler koyulaşır, siyah çizgiler görünür griye döner. */
		function darkLine(c) {
			if (c.a === 0) return null;
			const y = luma(c);
			const { hue, sat, l } = toHsl(c);
			if (y > 0.6) return fromHsl(hue, Math.min(sat, 0.4), 0.18 + (1 - l) * 0.3, c.a);
			if (y < 0.15) return fromHsl(hue, sat, 0.32, c.a);
			return null;
		}

		/** Bildirimi ortak bir sınıfa bağlar; kural yalnızca ilgili kip açıkken geçerlidir. */
		function rule(pseudo, decls) {
			if (/[{}<>\\]/.test(decls)) return "";
			const key = mode + "|" + pseudo + "|" + decls;
			let cls = palette.get(key);
			if (cls !== undefined) return cls;
			cls = "gk-p" + (serial++).toString(36);
			// Kimlik seçicili :not() yalnızca önceliği artırır; temanın !important kurallarını da geçer.
			const ok = runtime.add(`html.gk-${mode} .${cls}:not(#gk-z):not(#gk-z)${pseudo} { ${decls} }`);
			if (!ok) cls = "";
			palette.set(key, cls);
			return cls;
		}

		// ---- öğe listesi ----
		const usable = (el) => el.namespaceURI === XHTML && !SKIP.has(el.tagName);
		const svgRoot = (el) => el.namespaceURI === SVGNS && el.localName === "svg" && !!el.parentElement && el.parentElement.namespaceURI === XHTML;

		function elementsOf(root, deep, out, cap) {
			if (root.nodeType !== 1) return;
			if (svgRoot(root)) {
				out.push(root);
				return;
			}
			if (!usable(root)) return;
			const start = out.length;
			out.push(root);
			if (!deep) return;
			const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
				acceptNode: (n) => {
					if (n.namespaceURI === SVGNS) {
						if (svgRoot(n)) out.push(n);
						return NodeFilter.FILTER_REJECT;
					}
					return usable(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
				},
			});
			let n;
			while ((n = walker.nextNode())) {
				out.push(n);
				// Çok büyük bir alt ağaç değiştiyse (ör. <body> sınıfı) yalnızca öğenin kendisine bakılır.
				if (cap && out.length - start > cap) {
					out.length = start + 1;
					return;
				}
			}
		}

		// ---- ölçüm ----
		function pseudoLayer(el, which, r) {
			const ps = getComputedStyle(el, which);
			if (!ps.content || ps.content === "none" || ps.content === "normal" || ps.display === "none") return null;
			const w = parseFloat(ps.width);
			const hgt = parseFloat(ps.height);
			if (!(w >= 0.5 * r.width && hgt >= 0.5 * r.height)) return null;
			if (/url\(/.test(ps.backgroundImage)) return null;
			return {
				bg: parse(ps.backgroundColor),
				gradient: /gradient\(/.test(ps.backgroundImage) ? ps.backgroundImage : null,
				opacity: parseFloat(ps.opacity),
			};
		}

		function measure(el) {
			const cs = getComputedStyle(el);
			const r = el.getBoundingClientRect();
			if (el.namespaceURI === SVGNS) return { svg: true, fill: parse(cs.fill), stroke: parse(cs.stroke), small: r.width <= 64 && r.height <= 64 };
			const img = cs.backgroundImage;
			const m = {
				bg: parse(cs.backgroundColor),
				img,
				url: /url\(/.test(img),
				gradient: !/url\(/.test(img) && /gradient\(/.test(img),
				color: parse(cs.color),
				opacity: parseFloat(cs.opacity),
				big: r.width >= 150 && r.height >= 80,
				page: false,
				borders: null,
				before: null,
				after: null,
			};
			// Sayfanın tamamını saran zemin desenleri fotoğraf sayılmaz.
			if (m.url) m.page = el === doc.body || (r.height >= 0.75 * page.h && r.width >= 0.9 * page.w);
			if (mode === "dark") {
				const widths = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth];
				if (widths.some((v) => parseFloat(v) > 0)) m.borders = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parse);
			}
			// Kaplayan ::before / ::after katmanları konumlandırılmış öğelerde olur; diğerlerine bakılmaz.
			if (m.big && cs.position !== "static") {
				m.before = pseudoLayer(el, "::before", r);
				m.after = pseudoLayer(el, "::after", r);
			}
			return m;
		}

		// ---- karar ----
		function decideContrast(m) {
			const cls = [];
			if (m.svg) {
				// Simge boyutundaki SVG'ler yazı rengini alır (beyaz; bağlantı içinde sarı).
				if (m.small && m.fill && m.fill.a > 0) cls.push(rule("", "fill: currentColor !important"));
				if (m.small && m.stroke && m.stroke.a > 0) cls.push(rule("", "stroke: currentColor !important"));
				return cls;
			}
			if (m.url && !m.page) cls.push("gk-cimg");
			if (m.gradient) cls.push(rule("", `background-image: ${mapColors(m.img, black)} !important`));
			const a = m.bg ? m.bg.a : 1;
			if (a === 0) cls.push("gk-c0");
			else if (a < 1) cls.push(rule("", `background-color: ${fmt(black(m.bg))} !important`));
			for (const [which, p] of [["::before", m.before], ["::after", m.after]]) {
				if (!p) continue;
				const decls = [];
				if (p.gradient) decls.push(`background-image: ${mapColors(p.gradient, black)} !important`);
				if (p.bg && p.bg.a > 0) decls.push(`background-color: ${fmt(black(p.bg))} !important`);
				if (decls.length) cls.push(rule(which, decls.join("; ")));
			}
			return cls;
		}

		function decideDark(m, parentEff) {
			const cls = [];
			if (m.svg) {
				if (parentEff === "dark") {
					const f = m.fill && darkInk(m.fill);
					const s2 = m.stroke && darkInk(m.stroke);
					if (f) cls.push(rule("", `fill: ${fmt(f)} !important`));
					if (s2) cls.push(rule("", `stroke: ${fmt(s2)} !important`));
				}
				return { cls, eff: parentEff };
			}
			const photo = m.url && !m.page && m.big;
			const inPhoto = parentEff === "image";
			const translucent = (c, opacity) => c.a < 0.85 || opacity < 0.85;
			let finalBg = m.bg;
			let pseudoBg = null;

			if (m.url && m.page) cls.push(rule("", "background-image: none !important"));
			if (m.bg && m.bg.a > 0 && !(inPhoto && translucent(m.bg, m.opacity))) {
				const t = darkBg(m.bg);
				if (t) {
					cls.push(rule("", `background-color: ${fmt(t)} !important`));
					finalBg = t;
				}
			}
			if (m.gradient && !inPhoto) {
				const g = mapColors(m.img, darkBg);
				if (g !== m.img) cls.push(rule("", `background-image: ${g} !important`));
			}
			for (const [which, p] of [["::before", m.before], ["::after", m.after]]) {
				if (!p) continue;
				const overPhoto = inPhoto || photo;
				const decls = [];
				if (p.gradient && !overPhoto) {
					const g = mapColors(p.gradient, darkBg);
					if (g !== p.gradient) decls.push(`background-image: ${g} !important`);
				}
				if (p.bg && p.bg.a > 0) {
					const thin = translucent(p.bg, p.opacity);
					if (!(overPhoto && thin)) {
						const t = darkBg(p.bg);
						if (t) decls.push(`background-color: ${fmt(t)} !important`);
						if (!thin) pseudoBg = t || p.bg;
					}
				}
				if (decls.length) cls.push(rule(which, decls.join("; ")));
			}

			let eff = parentEff;
			if (photo) eff = "image";
			else if (finalBg && finalBg.a >= 0.85 && m.opacity >= 0.85) eff = luma(finalBg) < 0.5 ? "dark" : "light";
			else if (pseudoBg) eff = luma(pseudoBg) < 0.5 ? "dark" : "light";
			else if (m.gradient && !inPhoto) eff = "dark";

			if (eff === "dark" && m.color) {
				const t = darkInk(m.color);
				if (t) cls.push(rule("", `color: ${fmt(t)} !important`));
			}
			if (m.borders && eff !== "image" && m.borders.every(Boolean)) {
				const t = m.borders.map((c) => darkLine(c) || c);
				if (t.some((c, i) => c !== m.borders[i])) cls.push(rule("", `border-color: ${t.map(fmt).join(" ")} !important`));
			}
			return { cls, eff };
		}

		function apply(el, cls) {
			const want = cls.filter(Boolean);
			for (const c of [...el.classList]) if (isPaintClass(c) && !want.includes(c)) el.classList.remove(c);
			for (const c of want) if (!el.classList.contains(c)) el.classList.add(c);
			if (want.length) marked.add(el);
			else marked.delete(el);
		}

		/**
		 * Koyu modda sayfa değişikliklerinde yalnızca ilgili öğelerin boyama sınıfları geçici olarak
		 * kaldırılıp ölçülür (koyu modun tüm renkleri öğe sınıflarıyla verildiği için yeterlidir).
		 * Böylece her değişiklikte bütün sayfanın stili yeniden hesaplanmaz.
		 */
		function measureLocal(list, fn) {
			const saved = list.map((el) => [...el.classList].filter(isPaintClass));
			list.forEach((el, i) => {
				el.classList.add("gk-pm");
				if (saved[i].length) el.classList.remove(...saved[i]);
			});
			try {
				return fn();
			} finally {
				list.forEach((el, i) => {
					if (saved[i].length) el.classList.add(...saved[i]);
				});
				void htmlEl.offsetWidth;
				for (const el of list) el.classList.remove("gk-pm");
			}
		}

		function scan(list, partial) {
			if (!list.length || !mode) return;
			const read = () => {
				page.h = htmlEl.scrollHeight;
				page.w = htmlEl.clientWidth;
				return list.map(measure);
			};
			runtime.ensure();
			const measured = partial && mode === "dark" ? measureLocal(list, read) : measureOriginal(read);
			const local = new Map();
			list.forEach((el, i) => {
				const m = measured[i];
				if (mode === "contrast") {
					apply(el, decideContrast(m));
					return;
				}
				const parent = el.parentElement;
				const parentEff = (parent && (local.get(parent) || effOf.get(parent))) || "dark";
				const d = decideDark(m, parentEff);
				local.set(el, d.eff);
				effOf.set(el, d.eff);
				apply(el, d.cls);
			});
		}

		function full() {
			for (const el of marked) if (!el.isConnected) marked.delete(el);
			const list = [];
			elementsOf(doc.body, true, list, 0);
			scan(list);
		}

		function flush() {
			timer = 0;
			const list = [];
			for (const [node, deep] of pending) if (node.isConnected) elementsOf(node, deep, list, 1500);
			pending = new Map();
			scan(list, true);
		}

		const ourClassesOnly = (oldValue, el) => {
			const strip = (v) => (v || "").split(/\s+/).filter((c) => c && !c.startsWith("gk-")).sort().join(" ");
			return strip(oldValue) === strip(el.getAttribute("class"));
		};
		// Satır içi stilde yalnızca renk ve zemin değişiklikleri önemlidir (ör. sonradan yüklenen slayt
		// görseli, kaydırınca renklenen başlık). Hareket ve saydamlık animasyonları yok sayılır.
		const STYLE_RE = /(?:^|;)\s*(?:background(?:-color|-image)?|color)\s*:[^;]*/gi;
		const styleKey = (v) => ((v || "").match(STYLE_RE) || []).join("|");

		function onMutations(list) {
			for (const m of list) {
				if (m.type === "childList") {
					for (const node of m.addedNodes) if (node.nodeType === 1) pending.set(node, true);
				} else if (m.attributeName === "class") {
					if (!ourClassesOnly(m.oldValue, m.target)) pending.set(m.target, true);
				} else if (styleKey(m.oldValue) !== styleKey(m.target.getAttribute("style"))) {
					pending.set(m.target, true);
				}
			}
			if (pending.size && !timer) timer = window.setTimeout(flush, 250);
		}

		// Koyu mod: fareyle üzerine gelinen öğenin renkleri kısa bir gecikmeyle yeniden okunur; böylece
		// düğme ve bağlantıların üzerine gelme renkleri de koyu moda uyarlanır.
		function onHover(e) {
			const t = e.target;
			if (mode !== "dark" || !t || t.nodeType !== 1 || t.tagName === "GOZKULAK-ROOT") return;
			hoverTargets.add(t);
			window.clearTimeout(hoverTimer);
			hoverTimer = window.setTimeout(() => {
				const list = [];
				for (const el of hoverTargets) {
					if (!el.isConnected) continue;
					const chain = [];
					for (let a = el.parentElement, i = 0; a && a !== doc.body && i < 3; a = a.parentElement, i++) chain.unshift(a);
					for (const a of chain) elementsOf(a, false, list, 0);
					elementsOf(el, true, list, 150);
				}
				hoverTargets.clear();
				scan(list, true);
			}, 300);
		}

		const LISTEN = { capture: true, passive: true };

		function set(next) {
			if (next === mode) return;
			mode = next;
			window.clearTimeout(timer);
			window.clearTimeout(lateTimer);
			window.clearTimeout(hoverTimer);
			timer = 0;
			pending = new Map();
			hoverTargets.clear();
			if (!mode) {
				if (observer) observer.disconnect();
				observer = null;
				doc.removeEventListener("pointerover", onHover, LISTEN);
				doc.removeEventListener("pointerout", onHover, LISTEN);
				for (const el of marked) apply(el, []);
				marked.clear();
				return;
			}
			full();
			if (!observer) {
				observer = new MutationObserver(onMutations);
				observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"], attributeOldValue: true });
			}
			doc.addEventListener("pointerover", onHover, LISTEN);
			doc.addEventListener("pointerout", onHover, LISTEN);
			// Sayfa yüklenirken açıldıysa, sonradan devreye giren slaytlar ve gecikmeli stiller için bir kez daha
			if (doc.readyState !== "complete" || performance.now() < 8000) {
				lateTimer = window.setTimeout(() => {
					if (mode) full();
				}, 1500);
			}
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
		paint.set(prefs.contrast ? "contrast" : prefs.darkMode ? "dark" : null);
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

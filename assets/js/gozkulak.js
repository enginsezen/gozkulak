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

	// Betik dosyasının kendi sürümü. Eklentinin sürümüyle uyuşmazsa sayfa eski (önbellekteki) bir
	// betik dosyası kullanıyordur; test modunda menüde uyarı gösterilir.
	const SCRIPT_VERSION = "0.3.2";
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
			stale: "Uyarı: sayfa eski bir GözKulak betiği kullanıyor (betik %1, eklenti %2). Sitenin önbelleğini temizleyip sayfayı Ctrl + Shift + R ile yenileyin.",
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
			ttsTitle: "Sesli okuma",
			ttsListen: "Sayfayı dinle",
			ttsPause: "Duraklat",
			ttsResume: "Devam et",
			ttsStop: "Okumayı durdur",
			ttsPrev: "Önceki cümle",
			ttsNext: "Sonraki cümle",
			ttsRate: "Okuma hızı",
			ttsSlower: "Daha yavaş oku",
			ttsFaster: "Daha hızlı oku",
			rates: ["Yavaş", "Normal", "Hızlı", "Çok hızlı"],
			clickRead: "Tıklayarak dinle",
			ttsHint: "Bir metin seçtiyseniz yalnızca o okunur. \"Tıklayarak dinle\" açıkken sayfada bir yere tıklayınca okuma oradan başlar.",
			ttsPos: "Okunuyor: %1 / %2",
			ttsPaused: "Duraklatıldı: %1 / %2",
			ttsNothing: "Okunacak metin bulunamadı.",
			ttsNoVoice: "Bu tarayıcıda bu dil için okuma sesi bulunamadı.",
			ttsError: "Okuma sırasında bir sorun oldu.",
			ttsDone: "Okuma bitti.",
			naturalVoice: "Doğal ses (yapay zekâ)",
			ttsAskText: "Doğal ses, yapay zekâ ile sizin cihazınızda üretilir. Bunun için bir kez yaklaşık 40 MB indirilir; sonraki okumalarda yeniden inmez. Mobil veri kullanıyorsanız Wi-Fi önerilir.",
			ttsAskYes: "İndir ve dinle",
			ttsAskBrowser: "Tarayıcının sesiyle dinle",
			ttsAskCancel: "Vazgeç",
			ttsCancel: "İptal et",
			ttsDownloading: "Doğal ses indiriliyor: %%1",
			ttsPreparing: "Doğal ses hazırlanıyor…",
			ttsProgress: "Doğal sesin indirilmesi",
			ttsAiNote: "Bu ses yapay zekâ ile üretilmiştir.",
			ttsNaturalFailed: "Doğal ses yüklenemedi; tarayıcının sesiyle okunuyor.",
			ttsNaturalBroke: "Doğal seste bir sorun oldu; okuma tarayıcının sesiyle sürüyor.",
			ttsNaturalNone: "Doğal ses yüklenemedi ve bu tarayıcıda Türkçe okuma sesi bulunamadı.",
			ttsSlow: "Doğal ses bu cihazda yavaş kaldı; tarayıcının sesine geçildi. İsterseniz \"Doğal ses\" seçeneğini yeniden açabilirsiniz.",
		},
		en: {
			open: "Open accessibility menu",
			title: "Accessibility",
			close: "Close menu",
			test: "Test mode: only administrators can see this menu.",
			stale: "Warning: this page uses an outdated GözKulak script (script %1, plugin %2). Clear the site cache and reload with Ctrl + Shift + R.",
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
			ttsTitle: "Read aloud",
			ttsListen: "Listen to this page",
			ttsPause: "Pause",
			ttsResume: "Resume",
			ttsStop: "Stop reading",
			ttsPrev: "Previous sentence",
			ttsNext: "Next sentence",
			ttsRate: "Reading speed",
			ttsSlower: "Read slower",
			ttsFaster: "Read faster",
			rates: ["Slow", "Normal", "Fast", "Very fast"],
			clickRead: "Click to listen",
			ttsHint: "If you select some text, only the selection is read. With \"Click to listen\" on, clicking on the page starts reading from there.",
			ttsPos: "Reading: %1 / %2",
			ttsPaused: "Paused: %1 / %2",
			ttsNothing: "No text to read was found.",
			ttsNoVoice: "This browser has no reading voice for this language.",
			ttsError: "Something went wrong while reading.",
			ttsDone: "Finished reading.",
			naturalVoice: "Natural voice (AI)",
			ttsAskText: "The natural voice is generated by AI on your device. This needs a one-time download of about 40 MB; it is not downloaded again for later readings. On mobile data, Wi-Fi is recommended.",
			ttsAskYes: "Download and listen",
			ttsAskBrowser: "Listen with the browser voice",
			ttsAskCancel: "Cancel",
			ttsCancel: "Cancel",
			ttsDownloading: "Downloading the natural voice: %1%",
			ttsPreparing: "Preparing the natural voice…",
			ttsProgress: "Natural voice download",
			ttsAiNote: "This voice is generated by AI.",
			ttsNaturalFailed: "The natural voice could not be loaded; reading with the browser voice.",
			ttsNaturalBroke: "The natural voice ran into a problem; reading continues with the browser voice.",
			ttsNaturalNone: "The natural voice could not be loaded and this browser has no reading voice for this language.",
			ttsSlow: "The natural voice was too slow on this device; switched to the browser voice. You can turn \"Natural voice\" back on if you like.",
		},
	}[lang];

	const SHORTCUT = { code: "KeyG", label: "Alt + Shift + G" };
	const FONT_STEPS = [1, 1.15, 1.3, 1.5, 1.75];
	const LEVELS = 3;
	// Okuma hızları (Yavaş, Normal, Hızlı, Çok hızlı)
	const RATES = [0.8, 1, 1.2, 1.45];

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
	// Sesli okuma: okuma hızı ve tıklayarak dinleme tercihleri bu özelliğe bağlıdır.
	const SPEECH = enabledFeatures.has("text_to_speech");
	if (SPEECH) {
		ENABLED.add("ttsRate");
		ENABLED.add("clickRead");
	}
	// Doğal ses (EMA Lightning) yalnızca Türkçe sayfalarda ve gereken tarayıcı olanakları varsa sunulur.
	const TTS = cfg.tts && typeof cfg.tts === "object" ? cfg.tts : {};
	const NATURAL = SPEECH && lang === "tr" && typeof TTS.worker === "string" && /^https?:\/\//.test(TTS.worker) &&
		typeof window.Worker === "function" && typeof window.WebAssembly === "object" &&
		!!(window.AudioContext || window.webkitAudioContext) && !!(window.crypto && window.crypto.subtle);
	// Hazır ses: yöneticinin önceden üretip siteye yüklediği cümle dosyaları (bu sayfanın listesi).
	// Model ve Worker gerekmez; tarayıcının Ogg Opus çalabilmesi yeter.
	const AUDIO = cfg.audio && typeof cfg.audio === "object" && typeof cfg.audio.base === "string" &&
		/^https?:\/\//.test(cfg.audio.base) && Array.isArray(cfg.audio.files) ? cfg.audio : null;
	const PREPARED = SPEECH && lang === "tr" && !!AUDIO && !!(window.crypto && window.crypto.subtle) &&
		typeof window.Audio === "function" && !!new window.Audio().canPlayType('audio/ogg; codecs="opus"');
	if (NATURAL || PREPARED) ENABLED.add("naturalVoice");

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
			case "grip":
				add(path("M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4", { "stroke-width": "2.2" }));
				break;
			case "play":
				add(s("path", { d: "M8 5.5v13l10.5-6.5z", fill: "currentColor" }));
				break;
			case "pause":
				add(s("rect", { x: 6.5, y: 5.5, width: 4, height: 13, rx: 1, fill: "currentColor" }), s("rect", { x: 13.5, y: 5.5, width: 4, height: 13, rx: 1, fill: "currentColor" }));
				break;
			case "stop":
				add(s("rect", { x: 6.5, y: 6.5, width: 11, height: 11, rx: 1.5, fill: "currentColor" }));
				break;
			case "prev":
				add(s("path", { d: "M17 6v12L9 12z", fill: "currentColor" }), path("M7 6v12", { "stroke-width": "2.2" }));
				break;
			case "next":
				add(s("path", { d: "M7 6v12l8-6z", fill: "currentColor" }), path("M17 6v12", { "stroke-width": "2.2" }));
				break;
			case "speaker":
				add(path("M4 9.5h3.5L12 6v12l-4.5-3.5H4z"), path("M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"));
				break;
			case "voice":
				add(path("M4 10.5v3M7.5 8v8M11 5v14M14.5 8.5v7M18 10v4", { "stroke-width": "2" }), path("M20.5 4.5v3M19 6h3", { "stroke-width": "1.5" }));
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
		ttsRate: 1,
		clickRead: false,
		naturalVoice: true,
	};
	const MAX = { fontSize: FONT_STEPS.length - 1, lineHeight: LEVELS - 1, letterSpacing: LEVELS - 1, ttsRate: RATES.length - 1 };

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
					for (const node of m.addedNodes) {
						if (isStyleNode(node)) scheduleFull();
						else if (node.nodeType === 1) pending.set(node, true);
					}
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

		/*
		 * Bazı siteler stil dosyalarının bir kısmını sayfa açıldıktan sonra yükler (ör. "kritik CSS"
		 * ve ertelenmiş CSS kullanan hız eklentileri). Yeni stil gelince renkler değişir; sayfa baştan
		 * okunur. Aksi halde geç gelen beyaz zeminler koyulaşmaz, açılmış yazılar beyaz zeminde kalır.
		 */
		let fullTimer = 0;
		let headObserver = null;
		function scheduleFull() {
			if (!mode) return;
			window.clearTimeout(fullTimer);
			fullTimer = window.setTimeout(() => {
				fullTimer = 0;
				if (mode) full();
			}, 200);
		}
		const isStyleNode = (n) => n.nodeType === 1 && (n.tagName === "STYLE" || (n.tagName === "LINK" && /stylesheet|preload/i.test(n.rel || "")));
		function onResourceLoad(e) {
			if (e.target && e.target.tagName === "LINK") scheduleFull();
		}
		function onHeadMutations(list) {
			for (const m of list) {
				const changed = m.type === "attributes" ? isStyleNode(m.target) : m.target.tagName === "STYLE" || [...m.addedNodes, ...m.removedNodes].some(isStyleNode);
				if (changed) {
					scheduleFull();
					return;
				}
			}
		}
		function watchStyles(on) {
			if (on && !headObserver) {
				headObserver = new MutationObserver(onHeadMutations);
				headObserver.observe(doc.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["rel", "media", "href", "disabled"] });
				doc.addEventListener("load", onResourceLoad, true);
				if (doc.readyState !== "complete") window.addEventListener("load", scheduleFull, { once: true });
			} else if (!on && headObserver) {
				headObserver.disconnect();
				headObserver = null;
				doc.removeEventListener("load", onResourceLoad, true);
				window.removeEventListener("load", scheduleFull);
				window.clearTimeout(fullTimer);
			}
		}

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
				watchStyles(false);
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
			watchStyles(true);
			// Sayfa yüklenirken açıldıysa, sonradan devreye giren slaytlar ve gecikmeli stiller için bir kez daha
			if (doc.readyState !== "complete" || performance.now() < 8000) {
				lateTimer = window.setTimeout(() => {
					if (mode) full();
				}, 1500);
			}
		}

		return { set };
	})();

	/*
	 * ---------- metni okumaya hazırlama ----------
	 * Ses motoruna gitmeden önce site metinlerindeki sorunlu kalıplar düzeltilir (Faz 0'da EMA'nın
	 * normalleştiricisiyle doğrulanan kurallar). Sayfadaki metne dokunulmaz; yalnızca okunacak kopya
	 * değişir. Konsoldan denemek için: GozKulak.prepare("Tel: +90 549 737 20 21")
	 */
	const speechText = (() => {
		const UP = "A-ZÇĞİÖŞÜÂÎÛ";
		const LOW = "a-zçğıöşüâîû";
		const VOWEL = /[AEIİOÖUÜÂÎÛaeıioöuüâîû]/;
		// Harf harf okunması gereken kısaltmalar (ünlü içerse bile)
		const KEEP = new Set(["MZA", "OSB", "SSL", "SEO", "PDF", "AVM", "KDV", "SGK", "PTT", "TL", "TC", "ABD", "AB", "AŞ", "SMS", "GPS", "USB", "SSD", "CNC", "LED", "TV", "WC", "DNS", "VPN", "PHP", "CSS", "HTML", "URL", "API", "AI", "TDK", "TBMM", "TCDD", "KVKK", "OSB", "ISO", "TSE", "CE", "AR", "GE", "BT", "IT", "HR", "IK", "İK", "ÖSYM", "KPSS", "YKS", "LGS", "TRT", "THY", "SSK", "BAĞ-KUR"]);
		// Kelime gibi okunan büyük harfli kısaltmalar
		const AS_WORD = { IP: "ip", UNESCO: "unesco", NATO: "nato", ASELSAN: "aselsan", TÜBİTAK: "tübitak", KARDEMİR: "kardemir", TÜİK: "tüik", İŞKUR: "işkur", AFAD: "afad", WIFI: "vayfay", "WI-FI": "vayfay" };
		const DAYS = "pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|monday|tuesday|wednesday|thursday|friday|saturday|sunday";

		// Türkçe sıra sayısı eki: sayının okunuşundaki son kelimeye göre (19 → on dokuz → "uncu")
		function ordinalSuffix(n) {
			const ONES = ["", "inci", "nci", "üncü", "üncü", "inci", "ncı", "nci", "inci", "uncu"];
			const TENS = ["", "uncu", "nci", "uncu", "ıncı", "nci", "ıncı", "inci", "inci", "ıncı"];
			if (n === 0) return "ıncı";
			if (n % 10) return ONES[n % 10];
			if (n % 100) return TENS[(n % 100) / 10];
			if (n % 1000) return "üncü";
			if (n % 1000000) return "inci";
			if (n % 1000000000) return "uncu";
			return "ıncı";
		}

		function phone(match) {
			let digits = match.replace(/\D/g, "");
			let head = "";
			if (/^90\d{10}$/.test(digits)) {
				head = "artı 90, ";
				digits = digits.slice(2);
			} else if (/^0\d{10}$/.test(digits)) {
				head = "0, ";
				digits = digits.slice(1);
			} else if (!/^[2-5]\d{9}$/.test(digits)) {
				return match;
			}
			return head + [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)].join(", ");
		}

		function caps(text, locale) {
			const isCapsWord = (w) => {
				const base = w.replace(/['’]\p{Ll}+$/u, "");
				return new RegExp("^[" + UP + "0-9'’-]+$").test(base) && new RegExp("[" + UP + "]").test(base);
			};
			// Büyük harfli kelime öbekleri (ör. "DEMİRYOLU MAKASI İMALATI") birlikte değerlendirilir.
			const tokens = text.split(/(\s+)/);
			const isCaps = tokens.map((t) => isCapsWord(t.replace(/[.,;:!?()"]+$/g, "").replace(/^[("]+/, "")));
			return tokens.map((tok, i) => {
				if (!isCaps[i]) return tok;
				const core = tok.replace(/[.,;:!?()"]+$/g, "").replace(/^[("]+/, "");
				const pre = tok.slice(0, tok.indexOf(core));
				const post = tok.slice(tok.indexOf(core) + core.length);
				const word = core.replace(/['’].*$/, "");
				const suffix = core.slice(word.length).replace(/^['’]/, "");
				// Harf harf okunan kısaltmanın eki ayrı okunur (KVKK'nın → KVKK nın); kelime gibi okunanda ek bitişik kalır.
				const spelled = (w) => pre + w + (suffix ? " " + suffix.toLocaleLowerCase(locale) : "") + post;
				const spoken = (w) => pre + w + (suffix ? "'" + suffix.toLocaleLowerCase(locale) : "") + post;
				if (AS_WORD[word]) return spoken(AS_WORD[word]);
				if (KEEP.has(word) || /\d/.test(word) || !VOWEL.test(word)) return spelled(word);
				const inPhrase = (i >= 2 && isCaps[i - 2]) || (i + 2 < tokens.length && isCaps[i + 2]);
				if (word.length <= 3 && !inPhrase) return spelled(word);
				return spoken(word.toLocaleLowerCase(locale));
			}).join("");
		}

		// JavaScript'te \b yalnızca ASCII harfleri tanır; Türkçe harfler için harf olmayan bir önceki karakter aranır.
		const W = "(?<![\\p{L}\\p{N}])";
		const abbr = (src, flags) => new RegExp(W + src, flags + "u");
		const ABBR = [
			[abbr("(?:Mah\\.?|Mh\\.)(?=\\s|,|$)", "gi"), "Mahallesi"],
			// "sok" ve "bul" aynı zamanda fiildir ("tek platformda bul."): yalnızca büyük harfle kısaltma sayılır.
			[abbr("Sok\\.?(?=\\s|,|$)", "g"), "Sokak"],
			[abbr("Sk\\.(?=\\s|,|$)", "gi"), "Sokak"],
			[abbr("(?:Cad\\.?|Cd\\.)(?=\\s|,|$)", "gi"), "Caddesi"],
			[abbr("Bul\\.(?=\\s)", "g"), "Bulvarı"],
			[abbr("(?:Bulv|Blv)\\.(?=\\s)", "gi"), "Bulvarı"],
			[abbr("Apt\\.(?=\\s)", "gi"), "Apartmanı"],
			[abbr("vb\\.(?=\\s|,|$)", "g"), "ve benzeri"],
			[abbr("vs\\.(?=\\s|,|$)", "g"), "vesaire"],
			[abbr("örn\\.(?=\\s)", "gi"), "örneğin"],
			[abbr("Dr\\.(?=\\s)", "g"), "Doktor"],
			[abbr("Prof\\.(?=\\s)", "g"), "Profesör"],
			[abbr("Doç\\.(?=\\s)", "g"), "Doçent"],
			[abbr("Tic\\.(?=\\s|,|$)", "g"), "Ticaret"],
			[abbr("San\\.(?=\\s|,|$)", "g"), "Sanayi"],
			[abbr("Ltd\\.(?=\\s|,|$)", "g"), "Limited"],
			[abbr("Şti\\.?(?=\\s|,|$)", "g"), "Şirketi"],
			[abbr("A\\.Ş\\.?(?=\\s|,|$)", "g"), "Anonim Şirketi"],
		];

		// Alan adı uzantıları: "Sezen.Pro" ve "karabuk78.com" gibi yazımlarda nokta okunur.
		const TLD = new Set(["com", "net", "org", "pro", "info", "biz", "io", "app", "dev", "co", "tr", "edu", "gov", "bel", "gen", "web", "tv", "me", "eu", "de", "uk", "us", "xyz", "site", "online", "store", "shop", "blog", "tech", "ai", "name", "mobi", "az", "cy", "nl", "fr", "it", "es", "ru", "k12", "av", "tsk", "pol"]);

		function tr(input) {
			let t = " " + String(input) + " ";
			t = t.replace(/[“”„«»″]/g, '"').replace(/[‘’‚′]/g, "'");
			t = t.replace(/\p{Extended_Pictographic}|️|‍/gu, "");
			t = t.replace(/[•·▪►▶→←↗↘✓✔]/g, ", ");
			// e-posta ve web adresleri
			t = t.replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, (m) => m.replace("@", " et ").replace(/\./g, " nokta "));
			t = t.replace(/\bhttps?:\/\/(www\.)?([\w-]+(\.[\w-]+)+)\S*/gi, (m, w, host) => host.replace(/\./g, " nokta "));
			t = t.replace(/\bwww\.([\w-]+(\.[\w-]+)+)\b/gi, (m, host) => host.replace(/\./g, " nokta "));
			// Noktayla birleşmiş sözcükler: alan adı gibi yazılmış adlarda ("Sezen.Pro", "karabuk78.com") nokta
			// okunur; noktadan sonra boşluk unutulmuşsa ("geldi.Sonra", "1.Bölüm") boşluk eklenir. Model bitişik
			// yazımı harf harf okuyor.
			for (let k = 0; k < 3; k++) {
				const before = t;
				t = t.replace(/([\p{L}\p{N}]+)\.(\p{L}{2,})(?![\p{L}\p{N}])/gu, (m, a, b) => (TLD.has(b.toLocaleLowerCase("tr")) ? a + " nokta " + b.toLocaleLowerCase("tr") : a + ". " + b));
				if (t === before) break;
			}
			// telefon
			t = t.replace(/\b(Tel|Tlf|Telefon)\s*[.:]\s*/gi, "Telefon: ").replace(/\b(Fax|Faks)\s*[.:]\s*/gi, "Faks: ").replace(/\bGSM\s*[.:]\s*/g, "Cep telefonu: ");
			t = t.replace(/(\+\s?90|\b0)?[\s(]*\d{3}[\s)]*\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, (m) => {
				const lead = m.match(/^\s*/)[0];
				return lead + phone(m.trim());
			});
			// tarih ve saat
			t = t.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, "$1.$2.$3");
			t = t.replace(/\b(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\b/g, "$1 ile $2");
			t = t.replace(new RegExp("\\b(" + DAYS + ")\\s*[-–—]\\s*(" + DAYS + ")\\b", "gi"), "$1 ile $2");
			t = t.replace(/\b7\s*\/\s*24\b/g, "7 gün 24 saat");
			// adres ve kısaltmalar
			for (const [re, out] of ABBR) t = t.replace(re, out);
			t = t.replace(/\bNo\s*[:.]\s*(?=\d)/gi, "numara ").replace(/\bKat\s*[:.]\s*(?=\d)/gi, "kat ").replace(/\bD\s*:\s*(?=\d)/g, "daire ");
			// numaralı başlık ve sıra sayıları
			t = t.replace(/^(\s*)(\d{1,3})[.)]\s+(?=[A-ZÇĞİÖŞÜ])/, "$1$2, ");
			t = t.replace(new RegExp("\\b(\\d{1,4})\\.(?=\\s+[" + LOW + "])", "g"), (m, n) => n + "'" + ordinalSuffix(parseInt(n, 10)));
			// birimler ve para
			t = t.replace(/\b(\d[\d.,]*)\s*km\b/gi, "$1 kilometre").replace(/\bkm\b/g, "kilometre");
			t = t.replace(/\b(\d[\d.,]*)\s*(m²|m2)(?=\s|[.,;]|$)/gi, "$1 metrekare");
			t = t.replace(/\b(\d[\d.,]*)\s*cm\b/gi, "$1 santimetre").replace(/\b(\d[\d.,]*)\s*kg\b/gi, "$1 kilogram");
			t = t.replace(/₺\s*(\d[\d.,]*)/g, "$1 lira").replace(/(\d[\d.,]*)\s*(₺|TL\b)/g, "$1 lira");
			t = t.replace(/%\s*(\d[\d.,]*)/g, "yüzde $1");
			const PER = { yıl: "yıllık", ay: "aylık", gün: "günlük", hafta: "haftalık", saat: "saatlik", kişi: "kişi başı" };
			t = t.replace(/\s*\/\s*(yıl|ay|gün|hafta|saat|kişi)(?![\p{L}])/gu, (m, w) => " " + PER[w]);
			// Tek başına "+": sonda ya da noktalamadan önce atılır ("₺5.000 +"), kelimeler arasında "ve" olur.
			t = t.replace(/\s\+\s*(?=[.,;]|\s*$)/g, "").replace(/\s\+\s+(?=\p{L})/gu, " ve ");
			// Harf ve rakam bitişikse ("Karabük78", içindekiler tablosunda "1Safranbolu'nun") araya boşluk girer.
			t = t.replace(/(\p{L})([0-9])/gu, "$1 $2").replace(/([0-9])(\p{L})/gu, "$1 $2");
			// Kısa bir satırın başındaki sıra numarası (içindekiler, numaralı başlık): "1, Safranbolu'nun…"
			if (t.length < 100) t = t.replace(/^(\s*)(\d{1,2})\s+(?=\p{Lu}\p{Ll})/u, "$1$2, ");
			t = caps(t, "tr");
			// eğik çizgi ve tire
			t = t.replace(/(\d)\s*\/\s*([A-Za-zÇĞİÖŞÜçğıöşü])\b/g, "$1 $2");
			t = t.replace(new RegExp("([" + UP + LOW + "])\\s*/\\s*(?=[" + UP + LOW + "])", "g"), "$1, ");
			t = t.replace(/\s[-–—]\s/g, ", ");
			t = t.replace(/\s&\s/g, " ve ");
			return finish(t);
		}

		function en(input) {
			let t = " " + String(input) + " ";
			t = t.replace(/[“”„«»″]/g, '"').replace(/[‘’‚′]/g, "'");
			t = t.replace(/\p{Extended_Pictographic}|️|‍/gu, "");
			t = t.replace(/[•·▪►▶→←↗↘✓✔]/g, ", ");
			t = t.replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, (m) => m.replace("@", " at ").replace(/\./g, " dot "));
			t = t.replace(/\bhttps?:\/\/(www\.)?([\w-]+(\.[\w-]+)+)\S*/gi, (m, w, host) => host.replace(/\./g, " dot "));
			t = t.replace(/(\+\s?90|\b0)?[\s(]*\d{3}[\s)]*\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, (m) => {
				const lead = m.match(/^\s*/)[0];
				return lead + phone(m.trim()).replace("artı", "plus");
			});
			t = t.replace(/^(\s*)(\d{1,3})[.)]\s+(?=[A-Z])/, "$1$2, ");
			t = caps(t, "en");
			t = t.replace(/([A-Za-z])\s*\/\s*(?=[A-Za-z])/g, "$1, ");
			t = t.replace(/\s[-–—]\s/g, ", ");
			return finish(t);
		}

		function finish(t) {
			t = t.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/,\s*,/g, ",").replace(/^[\s,]+/, "").trim();
			if (t && !/[.!?…:;]$/.test(t)) t += ".";
			return t;
		}

		return { tr, en, ordinalSuffix };
	})();

	/**
	 * Bir bloğun metnini cümlelere böler; her cümle için metindeki başlangıç ve bitiş konumunu verir
	 * (sayfada vurgulamak için). Kısaltmalar, ondalık sayılar, tarihler ve sıra sayıları bölünmez;
	 * çok uzun cümleler virgüllerden parçalanır.
	 */
	const splitSentences = (() => {
		const NO_SPLIT = /(?:^|[\s(])(?:mah|mh|sok|sk|cad|cd|bulv|blv|apt|no|tel|tic|san|ltd|şti|vb|vs|örn|dr|prof|doç|av|op|uzm|hz|sn|bkz|yy|st|mr|mrs|ms|vs|etc|e\.g|i\.e|a\.ş|t\.c)\.$/i;
		const MAX = 260;
		return function split(text) {
			const out = [];
			const re = /[.!?…]+["')\]]*(?=\s+["'(\[]?[A-ZÇĞİÖŞÜ0-9]|\s*$)/g;
			let start = 0;
			let m;
			while ((m = re.exec(text))) {
				const end = m.index + m[0].length;
				const head = text.slice(start, end);
				const before = text.slice(0, m.index + 1);
				if (m[0][0] === "." && (NO_SPLIT.test(before) || /(?:^|\s)[A-ZÇĞİÖŞÜ]\.$/.test(before) || (/^\s*\d{1,3}\.$/.test(head)))) continue;
				push(start, end);
				start = end;
			}
			if (start < text.length) push(start, text.length);
			return out;

			function push(a, b) {
				while (a < b && /\s/.test(text[a])) a++;
				while (b > a && /\s/.test(text[b - 1])) b--;
				if (b <= a || !/[\p{L}\p{N}]/u.test(text.slice(a, b))) return;
				// Uzun cümle: virgül, noktalı virgül ya da tireden bölünür.
				while (b - a > MAX) {
					const part = text.slice(a, a + MAX);
					const cut = Math.max(part.lastIndexOf(", "), part.lastIndexOf("; "), part.lastIndexOf(" – "), part.lastIndexOf(" - "));
					const at = cut > MAX * 0.4 ? a + cut + 1 : a + Math.max(part.lastIndexOf(" "), Math.floor(MAX * 0.8));
					out.push([a, at]);
					a = at;
					while (a < b && /\s/.test(text[a])) a++;
				}
				out.push([a, b]);
			}
		};
	})();

	/*
	 * ---------- okunacak içerik ----------
	 * Okunacak alan site ayarındaki seçicilerden (yoksa sayfanın ana bölgesinden) alınır. Yalnızca görünen
	 * metin okunur; menü, form, düğme ve ekran okuyucuya özel gizli metinler atlanır. Tekrarlanan bloklar
	 * (ör. mobil kopyalar) ve üst üste aynı başlık bir kez okunur. Her cümle sayfadaki yerini bilir;
	 * vurgulama DOM'a dokunmadan (CSS Highlight API) yapılır.
	 */
	const content = (() => {
		const SKIP = "nav, form, button, select, textarea, input, script, style, noscript, template, svg, iframe, canvas, video, audio, object, [aria-hidden='true'], [hidden], .screen-reader-text, .sr-only, .visually-hidden, .wpa-test-msg, #wpadminbar, gozkulak-root, gozkulak-overlay";
		// İçindekiler tabloları sayfa okunurken atlanır (başlıklar sayfada zaten okunuyor; kullanıcı kararı,
		// 2026-10-10). Seçilen metin okunurken atlanmaz.
		const TOC = ".lwptoc, #ez-toc-container, .ez-toc-container, #toc_container, .wp-block-rank-math-toc-block, .wp-block-yoast-seo-table-of-contents, .elementor-widget-table-of-contents, .wp-block-uagb-table-of-contents, .kb-table-of-content-nav, .wp-block-ht-block-toc, .wpj-jtoc, #ftwp-container, .simple-toc, [role='doc-toc'], #toc, .toc";
		const AUTO = ["main", "[role='main']", ".entry-content", ".post-content", "article", "#content", "#Content", ".site-content", ".content-area"];
		const INLINE = /^(inline|inline-block|inline-flex|inline-grid|contents|ruby)$/;
		// Satır içi öğeler (span, a, strong…) float ya da flex/grid kapsayıcısı yüzünden blok olabilir; ör.
		// Listeo çalışma saatlerinde sağa yaslanan saat. Okumada bunlar satırın parçasıdır ("Salı 09:00 - 17:30"
		// tek cümle); yoksa "Salı" tek kelimelik bir cümle olarak kalır.
		const PHRASING = new Set(["SPAN", "A", "B", "STRONG", "EM", "I", "SMALL", "TIME", "ABBR", "MARK", "LABEL", "CITE", "Q", "SUB", "SUP", "CODE", "DATA", "BDI", "BDO", "U", "S", "VAR", "KBD", "SAMP", "DFN", "FONT"]);
		const FLEXLIKE = /^(flex|inline-flex|grid|inline-grid)$/;

		const visible = (el) => (el.checkVisibility ? el.checkVisibility({ checkVisibilityCSS: true }) : !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
		const textLength = (el) => (el.innerText || "").replace(/\s+/g, " ").trim().length;

		function roots() {
			let list = [];
			if (cfg.selector) {
				try {
					list = [...doc.querySelectorAll(cfg.selector)];
				} catch (e) {
					list = [];
				}
			}
			list = list.filter((el) => visible(el) && !el.closest("gozkulak-root"));
			list = list.filter((el) => !list.some((o) => o !== el && o.contains(el)));
			if (!list.length) {
				for (const sel of AUTO) {
					const found = [...doc.querySelectorAll(sel)].filter(visible).sort((a, b) => textLength(b) - textLength(a))[0];
					// <main> güvenilir bir işarettir; diğer adaylarda kısa bloklar (ör. tek bir kart) seçilmez.
					if (found && textLength(found) >= (/main/.test(sel) ? 40 : 200)) {
						list = [found];
						break;
					}
				}
			}
			if (!list.length) list = [doc.body];
			return list.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
		}

		// "block", "inline" ya da "soft" (blok olmuş satır içi öğe: satırın parçası, ama ayrı bir öğe)
		function kindOf(el, cache) {
			let v = cache && cache.get(el);
			if (v !== undefined) return v;
			const cs = getComputedStyle(el);
			v = INLINE.test(cs.display) ? "inline" : "block";
			if (v === "block" && PHRASING.has(el.tagName) && (cs.float !== "none" || (el.parentElement && FLEXLIKE.test(getComputedStyle(el.parentElement).display)))) v = "soft";
			if (cache) cache.set(el, v);
			return v;
		}

		function blockOf(node, root, cache) {
			for (let el = node.parentElement; el && el !== root.parentElement; el = el.parentElement) {
				if (el === root) return el;
				if (kindOf(el, cache) === "block") return el;
			}
			return root;
		}

		// Metin düğümünün bloğu içindeki en yakın "soft" öğe (yoksa null).
		function softOf(node, block, cache) {
			for (let el = node.parentElement; el && el !== block; el = el.parentElement) {
				if (kindOf(el, cache) === "soft") return el;
			}
			return null;
		}

		/**
		 * Kökün içindeki görünen metin düğümlerini bloklara toplar. range verilirse yalnızca seçimin
		 * içindeki kısım alınır.
		 */
		function blocksOf(root, range, seen) {
			const out = [];
			// Sayfa okunurken içindekiler tablosu, bütün sayfa okunuyorsa ayrıca sitenin başlığı, alt bilgisi ve
			// kenar çubukları atlanır.
			let skip = range ? SKIP : SKIP + ", " + TOC;
			if (root === doc.body) skip += ", header, footer, aside, [role='banner'], [role='contentinfo'], [role='complementary']";
			const okCache = new Map();
			const allowed = (el) => {
				if (okCache.has(el)) return okCache.get(el);
				const ok = !el.closest(skip) && visible(el);
				okCache.set(el, ok);
				return ok;
			};
			const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
				acceptNode(n) {
					if (n.nodeType === 1) {
						if (n !== root && n.matches(skip)) return NodeFilter.FILTER_REJECT;
						return NodeFilter.FILTER_SKIP;
					}
					if (!n.nodeValue.trim() || !n.parentElement || !allowed(n.parentElement)) return NodeFilter.FILTER_REJECT;
					if (range && !range.intersectsNode(n)) return NodeFilter.FILTER_REJECT;
					return NodeFilter.FILTER_ACCEPT;
				},
			});
			let current = null;
			let n;
			const displays = new Map();
			while ((n = walker.nextNode())) {
				const block = blockOf(n, root, displays);
				let from = 0;
				let to = n.nodeValue.length;
				if (range) {
					if (n === range.startContainer) from = range.startOffset;
					if (n === range.endContainer) to = range.endOffset;
				}
				if (to <= from) continue;
				if (!current || current.el !== block) {
					if (current) out.push(current);
					current = { el: block, text: "", segs: [] };
				} else if (current.segs.length && !/\s$/.test(current.text)) {
					// Aynı bloktaki düğümler arasında <br> ya da blok sınırı varsa virgül, ayrı öğelerse
					// (ör. sağa yaslanan saat) boşluk bırakılır; sözcükler birbirine yapışmaz.
					const prev = current.segs[current.segs.length - 1].node;
					if (brBetween(prev, n)) current.text += ", ";
					else if (softOf(prev, block, displays) !== softOf(n, block, displays) && !/^\s/.test(n.nodeValue.slice(from))) current.text += " ";
				}
				current.segs.push({ node: n, from, start: current.text.length, len: to - from });
				current.text += n.nodeValue.slice(from, to);
			}
			if (current) out.push(current);
			// Tekrarlanan bloklar ve üst üste aynı başlık bir kez okunur.
			return out.filter((b) => {
				const key = b.text.replace(/\s+/g, " ").trim();
				if (!/[\p{L}\p{N}]/u.test(key)) return false;
				if (key.length > 25 || /^H[1-6]$/.test(b.el.tagName)) {
					if (seen.has(key)) return false;
					seen.add(key);
				}
				return true;
			});
		}

		function brBetween(a, b) {
			const r = doc.createRange();
			r.setStartAfter(a);
			r.setEndBefore(b);
			const frag = r.cloneContents();
			return !!frag.querySelector && !!frag.querySelector("br, p, div, li");
		}

		function langOf(el) {
			const host = el.closest("[lang]");
			const l = (host && host.getAttribute("lang")) || htmlEl.lang || "tr";
			return /^en\b/i.test(l) ? "en" : /^tr\b/i.test(l) ? "tr" : l.slice(0, 2).toLowerCase();
		}

		function sentencesOf(blocks) {
			const list = [];
			for (const block of blocks) {
				const lang = langOf(block.el);
				for (const [a, b] of splitSentences(block.text)) {
					const raw = block.text.slice(a, b);
					const speech = lang === "tr" ? speechText.tr(raw) : speechText.en(raw);
					if (!/[\p{L}\p{N}]/u.test(speech)) continue;
					list.push({ block, a, b, text: raw.replace(/\s+/g, " ").trim(), speech, lang });
				}
			}
			return list;
		}

		/** Sayfanın okunacak alanındaki tüm cümleler. */
		function page() {
			const seen = new Set();
			return sentencesOf(roots().flatMap((root) => blocksOf(root, null, seen)));
		}

		/** Seçili metnin cümleleri (seçim yoksa boş). */
		function selection() {
			const sel = window.getSelection && window.getSelection();
			if (!sel || sel.isCollapsed || !sel.rangeCount) return [];
			const range = sel.getRangeAt(0);
			if (!range.toString().trim()) return [];
			let root = range.commonAncestorContainer;
			if (root.nodeType !== 1) root = root.parentElement;
			if (!root || root.closest("gozkulak-root")) return [];
			return sentencesOf(blocksOf(root, range, new Set()));
		}

		/** Ekrandaki bir noktadan (tıklama) başlayarak okunacak cümleler ve başlangıç sırası. */
		function fromPoint(x, y) {
			let node = null;
			let offset = 0;
			if (doc.caretPositionFromPoint) {
				const p = doc.caretPositionFromPoint(x, y);
				if (p) {
					node = p.offsetNode;
					offset = p.offset;
				}
			} else if (doc.caretRangeFromPoint) {
				const r = doc.caretRangeFromPoint(x, y);
				if (r) {
					node = r.startContainer;
					offset = r.startOffset;
				}
			}
			if (!node || node.nodeType !== 3) return null;
			let list = page();
			let at = list.findIndex((s) => s.block.segs.some((g) => g.node === node && offset >= g.from && offset <= g.from + g.len && withinSentence(s, g, offset)));
			if (at < 0) {
				// Okunacak alanın dışına tıklandı: yalnızca o blok okunur.
				const el = blockOf(node, doc.body);
				list = sentencesOf(blocksOf(el, null, new Set()));
				at = list.findIndex((s) => s.block.segs.some((g) => g.node === node && withinSentence(s, g, offset)));
				if (at < 0) at = 0;
			}
			return list.length ? { list, at } : null;
		}

		function withinSentence(s, g, offset) {
			const pos = g.start + (offset - g.from);
			return pos >= s.a && pos <= s.b;
		}

		/** Cümlenin sayfadaki aralığı (vurgulama ve kaydırma için). */
		function rangeOf(s) {
			const segs = s.block.segs;
			const find = (pos, end) => {
				for (const g of segs) {
					if (end ? pos <= g.start + g.len && pos > g.start : pos < g.start + g.len) {
						const inner = Math.max(0, Math.min(g.len, pos - g.start));
						return [g.node, g.from + inner];
					}
				}
				const last = segs[segs.length - 1];
				return [last.node, last.from + last.len];
			};
			try {
				const r = doc.createRange();
				const [sn, so] = find(s.a, false);
				const [en, eo] = find(s.b, true);
				r.setStart(sn, so);
				r.setEnd(en, eo);
				return r;
			} catch (e) {
				return null;
			}
		}

		return { page, selection, fromPoint, rangeOf };
	})();

	/*
	 * ---------- tarayıcının kendi sesi (Web Speech API) ----------
	 * Duraklatma, tarayıcılar arasında güvenilir olmadığı için okumayı kesip yerini hatırlayarak yapılır.
	 */
	const browserVoice = (() => {
		const synth = window.speechSynthesis;
		let token = 0;
		let watchdog = 0;

		function voices() {
			return synth ? synth.getVoices() : [];
		}

		// Sesler bir kez beklenir. Linux'taki Chrome gibi hiç sesi olmayan tarayıcıda her okumada
		// yeniden beklenmez; sesler sonradan gelirse getVoices() onları zaten verir.
		let waited = null;
		function waitVoices() {
			if (!synth || voices().length) return Promise.resolve();
			if (!waited) {
				waited = new Promise((resolve) => {
					const done = () => {
						synth.removeEventListener("voiceschanged", done);
						resolve();
					};
					synth.addEventListener("voiceschanged", done);
					setTimeout(done, 1500);
				});
			}
			return waited;
		}

		function voiceFor(lang) {
			const list = voices().filter((v) => v.lang && v.lang.toLowerCase().replace("_", "-").startsWith(lang));
			return list.find((v) => v.localService && v.default) || list.find((v) => v.localService) || list[0] || null;
		}

		async function available(lang) {
			if (!synth || !window.SpeechSynthesisUtterance) return false;
			await waitVoices();
			return !!voiceFor(lang);
		}

		function cancel() {
			token++;
			window.clearInterval(watchdog);
			if (synth && (synth.speaking || synth.pending)) synth.cancel();
		}

		function speak(text, { lang, rate, onEnd, onError }) {
			cancel();
			const mine = token;
			const u = new window.SpeechSynthesisUtterance(text);
			const v = voiceFor(lang);
			if (v) u.voice = v;
			u.lang = v ? v.lang : lang === "tr" ? "tr-TR" : "en-US";
			u.rate = rate;
			let started = 0;
			const finish = () => {
				if (mine !== token) return;
				window.clearInterval(watchdog);
				token++;
				onEnd();
			};
			u.onstart = () => {
				started = Date.now();
			};
			u.onend = finish;
			u.onerror = (e) => {
				if (mine !== token || e.error === "interrupted" || e.error === "canceled") return;
				window.clearInterval(watchdog);
				onError(e.error || "error");
			};
			// Bazı Android tarayıcıları "bitti" olayını göndermiyor; ses sustuysa cümle bitmiş sayılır.
			watchdog = window.setInterval(() => {
				if (mine !== token) return;
				if (started && !synth.speaking && !synth.pending && Date.now() - started > 800) finish();
			}, 700);
			// Hemen önceki cancel() ile aynı anda çağrılınca bazı tarayıcılar sesi yutuyor.
			window.setTimeout(() => {
				if (mine === token) synth.speak(u);
			}, 60);
		}

		return { available, speak, cancel, name: "browser" };
	})();

	/*
	 * ---------- okunan cümlenin vurgulanması ----------
	 * CSS Highlight API ile sayfaya hiç dokunmadan yapılır; desteklemeyen tarayıcıda cümlenin bloğu
	 * çerçevelenir. Okunan cümle ekran dışına çıkarsa sayfa kaydırılır (ziyaretçi kendisi kaydırıyorsa
	 * birkaç saniye beklenir).
	 */
	const readMark = (() => {
		const supported = !!(window.CSS && CSS.highlights && window.Highlight);
		let ready = false;
		let block = null;
		let userScroll = 0;

		function init() {
			if (ready) return;
			ready = true;
			runtime.add("::highlight(gk-read) { background-color: #ffe066; color: #111111; }");
			runtime.add(".gk-reading:not(#gk-z) { outline: 3px solid #ffbf00 !important; outline-offset: 3px !important; }");
			const mark = () => {
				userScroll = Date.now();
			};
			for (const ev of ["wheel", "touchmove"]) window.addEventListener(ev, mark, { passive: true });
			window.addEventListener("keydown", (e) => {
				if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) mark();
			}, { passive: true });
		}

		function show(s) {
			init();
			const range = content.rangeOf(s);
			clear();
			if (supported && range) CSS.highlights.set("gk-read", new window.Highlight(range));
			else {
				block = s.block.el;
				block.classList.add("gk-reading");
			}
			const r = range ? range.getBoundingClientRect() : s.block.el.getBoundingClientRect();
			if ((r.top < 70 || r.bottom > window.innerHeight - 140) && Date.now() - userScroll > 4000) {
				const calm = prefs.stopAnimations || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
				window.scrollBy({ top: r.top - window.innerHeight * 0.35, behavior: calm ? "auto" : "smooth" });
			}
		}

		function clear() {
			if (supported) CSS.highlights.delete("gk-read");
			if (block) block.classList.remove("gk-reading");
			block = null;
		}

		return { show, clear };
	})();

	/*
	 * ---------- ses çıkışı (Web Audio) ----------
	 * Doğal sesin parçaları aralıksız bir zaman çizelgesine dizilir. Duraklatmada ses bağlamı askıya
	 * alınır; devam edince okuma cümlenin ortasından sürer.
	 */
	const player = (() => {
		const RATE = 48000;
		const LEAD = 0.06;
		let ctx = null;
		let out = null;
		let next = 0;
		let stalled = 0; // sesin beklediği toplam süre (üretim yetişmedi)
		const sources = new Set();
		// Sayfa arka plandayken ya da ekran kilitliyken betikler durabilir; o sırada ve hemen sonrasında
		// biriken bekleme cihazın yavaşlığı sayılmaz.
		let visibleSince = 0;
		doc.addEventListener("visibilitychange", () => {
			if (!doc.hidden) visibleSince = performance.now();
		});
		const counts = () => !doc.hidden && performance.now() - visibleSince > 2000;

		// Ziyaretçinin dokunuşu ya da tıklaması içinde çağrılmalı (iOS ve otomatik oynatma kuralları).
		function unlock() {
			try {
				if (navigator.audioSession) navigator.audioSession.type = "playback";
			} catch (e) {
				// Desteklenmiyor: iOS'ta sessiz modda ses çıkmayabilir.
			}
			try {
				if (!ctx) {
					const AC = window.AudioContext || window.webkitAudioContext;
					ctx = new AC();
				}
				ctx.resume().catch(() => {});
				// iOS: sessiz bir örnek çalınarak ses çıkışı açılır.
				const src = ctx.createBufferSource();
				src.buffer = ctx.createBuffer(1, 1, 22050);
				src.connect(ctx.destination);
				src.start(0);
				return true;
			} catch (e) {
				return false;
			}
		}

		function reset() {
			for (const src of sources) {
				try {
					src.onended = null;
					src.stop();
				} catch (e) {
					// Zaten durmuş.
				}
			}
			sources.clear();
			if (out) out.disconnect();
			out = null;
			next = 0;
			stalled = 0;
		}

		// Ses bittiği andan beri geçen süre takılma olarak kaydedilir (tampon biriktirmeye başlarken).
		function markStall() {
			if (ctx && next > 0 && next < ctx.currentTime && counts()) stalled += ctx.currentTime - next;
			if (ctx) next = 0;
		}

		// Parçayı bir öncekinin bittiği yere ekler; başlayacağı anı döndürür. Tampondan gelen parçalar
		// (bilerek bekletildi) takılma sayılmaz.
		function push(pcm, held) {
			if (!ctx || !pcm.length) return -1;
			if (!out) {
				out = ctx.createGain();
				out.connect(ctx.destination);
			}
			const buf = ctx.createBuffer(1, pcm.length, RATE);
			if (buf.copyToChannel) buf.copyToChannel(pcm, 0);
			else buf.getChannelData(0).set(pcm);
			if (!held && next > 0 && next < ctx.currentTime && counts()) stalled += ctx.currentTime - next;
			const at = Math.max(next, ctx.currentTime + LEAD);
			const src = ctx.createBufferSource();
			src.buffer = buf;
			src.connect(out);
			src.onended = () => sources.delete(src);
			src.start(at);
			sources.add(src);
			next = at + buf.duration;
			return at;
		}

		return {
			unlock,
			reset,
			push,
			markStall,
			gap(sec) {
				if (ctx) next = Math.max(next, ctx.currentTime) + sec;
			},
			ahead: () => (ctx ? Math.max(0, next - ctx.currentTime) : 0),
			now: () => (ctx ? ctx.currentTime : 0),
			end: () => next,
			stalled: () => stalled,
			// Hoparlöre ulaşana kadarki gecikme (Bluetooth kulaklıkta belirgin): vurgu sesle eş geçsin.
			latency: () => (ctx ? Math.min(0.5, Number(ctx.outputLatency || ctx.baseLatency) || 0) : 0),
			// state alanı bazı tarayıcılarda gecikmeli güncellendiği için koşulsuz çağrılır (ikisi de
			// tekrar çağrılmaya dayanıklı).
			pause() {
				if (ctx) ctx.suspend().catch(() => {});
			},
			resume() {
				if (ctx) ctx.resume().catch(() => {});
			},
		};
	})();

	/*
	 * ---------- doğal ses motoru (EMA Lightning, Web Worker) ----------
	 * Motor, eklentinin kendi klasöründeki bir dosyadan açılan Worker'da çalışır; sayfa donmaz.
	 * Model ve ONNX Runtime dosyalarını Worker indirir ve SHA-256 ile doğrular (gozkulak-tts-worker.js).
	 * WebGPU yalnızca masaüstündeki Chromium tabanlı tarayıcılarda denenir; telefon ve tabletlerde,
	 * Safari ve Firefox'ta WASM kullanılır (Faz 0'da telefonda yalnızca WASM ölçüldü). WebGPU kurulamaz, hata verir ya da yavaş kalırsa motor WASM ile yeniden açılır ve bu,
	 * ziyaretçinin tarayıcısında hatırlanır. Okuma bittikten 5 dakika sonra motor bellekten atılır.
	 */
	const ema = (() => {
		const MEMO = "gozkulak:tts";
		const IDLE_MS = 5 * 60 * 1000;
		let worker = null;
		let starting = null;
		let seq = 0;
		const calls = new Map();
		let loaded = null;
		let loading = false;
		let loadingGpu = false;
		let build = "";
		let idleTimer = 0;
		let onProgress = null;

		function memo() {
			try {
				const v = JSON.parse(window.localStorage.getItem(MEMO) || "{}");
				return v && typeof v === "object" ? v : {};
			} catch (e) {
				return {};
			}
		}

		function remember(key, value) {
			try {
				const v = memo();
				v[key] = value;
				window.localStorage.setItem(MEMO, JSON.stringify(v));
			} catch (e) {
				// Depolama kapalı: yalnızca bu sayfada geçerli.
			}
		}

		const ios = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
		const gpuAllowed = () => !!navigator.userAgentData && navigator.userAgentData.mobile === false && "gpu" in navigator &&
			!ios() && memo().gpu !== false;

		const stopped = (code) => {
			const err = new Error(code === "crash" ? "Doğal ses motoru beklenmedik biçimde kapandı" : "Durduruldu");
			err.code = code;
			return err;
		};

		// Worker'ı kapatır; bekleyen işler hata ile sonlanır.
		function terminate(code) {
			if (worker) worker.terminate();
			worker = null;
			starting = null;
			const list = [...calls.values()];
			calls.clear();
			for (const c of list) c.reject(stopped(code));
		}

		function kill() {
			terminate("killed");
			loaded = null;
			loading = false;
			build = "";
		}

		function spawn() {
			if (starting) return starting;
			starting = new Promise((resolve, reject) => {
				let w;
				try {
					w = new window.Worker(TTS.worker, { type: "module", name: "gozkulak-tts" });
				} catch (e) {
					starting = null;
					reject(e);
					return;
				}
				worker = w;
				let ready = false;
				const timer = window.setTimeout(() => {
					if (ready) return;
					kill();
					reject(new Error("Doğal ses motoru başlatılamadı"));
				}, 15000);
				w.onmessage = (e) => {
					const m = e.data;
					if (!m || typeof m !== "object") return;
					if (m.ev === "ready") {
						ready = true;
						window.clearTimeout(timer);
						resolve();
						return;
					}
					const c = calls.get(m.id);
					if (!c) return;
					if (m.ev === "result") {
						calls.delete(m.id);
						c.resolve(m.data && typeof m.data === "object" ? m.data : {});
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
					window.clearTimeout(timer);
					if (w !== worker) return;
					const why = new Error("Doğal ses motoru hatası: " + ((e && e.message) || "bilinmiyor"));
					const wasReady = ready;
					// WebGPU ile çalışırken (ya da kurulurken) gelen beklenmedik hata WebGPU'ya yorulur:
					// motor WASM ile yeniden denenir.
					const wasLoading = loading;
					terminate(build === "webgpu" || (loading && loadingGpu) ? "gpu" : "crash");
					// Yükleme sürüyorsa sonucu yükleme işi belirler (WASM ile yeniden deneyebilir).
					if (!wasLoading) {
						loaded = null;
						build = "";
					}
					if (!wasReady) reject(why);
				};
			});
			return starting;
		}

		function call(msg, onEvent) {
			return spawn().then(() => new Promise((resolve, reject) => {
				if (!worker) {
					reject(stopped("killed"));
					return;
				}
				const id = ++seq;
				calls.set(id, { resolve, reject, onEvent });
				worker.postMessage(Object.assign({}, msg, { id }));
			}));
		}

		function busy() {
			window.clearTimeout(idleTimer);
		}

		// net: ziyaretçi bu sayfada indirmeyi onayladı mı. Onay yoksa yalnızca önbellekteki dosyalar
		// kullanılır; eksik dosya varsa yükleme "consent" koduyla biter ve onay sorulur.
		function load(net, progress) {
			busy();
			// Süren bir yüklemeye yeniden bağlanan okuma da ilerlemeyi görür.
			onProgress = progress || null;
			if (loaded) return loaded;
			loading = true;
			const report = (m) => {
				if (!onProgress) return;
				if (m.ev === "progress") onProgress({ done: Number(m.done) || 0, total: Number(m.total) || 0 });
				else if (m.ev === "stage") onProgress({ stage: String(m.stage || "") });
			};
			const attempt = (gpu) => {
				loadingGpu = gpu;
				return call({
					cmd: "load",
					base: typeof TTS.base === "string" ? TTS.base : "",
					fallback: TTS.fallback !== false,
					gpu,
					net: net === true,
				}, report);
			};
			const p = (async () => {
				let data;
				try {
					data = await attempt(gpuAllowed());
				} catch (err) {
					if (err.code !== "gpu") throw err;
					// WebGPU bu cihazda kurulamadı: WASM ile yeniden denenir ve hatırlanır.
					remember("gpu", false);
					terminate("killed");
					data = await attempt(false);
				}
				build = data.build === "webgpu" ? "webgpu" : "wasm";
				return data;
			})();
			loaded = p;
			p.then(() => {
				loading = false;
			}, () => {
				loading = false;
				if (loaded === p) loaded = null;
			});
			return p;
		}

		return {
			// Dosyalar önbellekte mi ve motor bu tarayıcıda çalışabilir mi. Süren ya da biten bir yükleme
			// varsa sorulmaz (yoklama, Worker'da yüklemenin arkasında sıraya girerdi).
			probe() {
				busy();
				if (loaded) return Promise.resolve({ ok: true, cached: true });
				return call({ cmd: "probe", gpu: gpuAllowed() });
			},
			load,
			synth(text, speed, quick, onAudio) {
				busy();
				return call({ cmd: "synth", text, speed, quick }, (m) => {
					if (m.ev === "audio" && m.pcm instanceof Float32Array) onAudio(m.pcm, Number(m.ms) || 0);
				});
			},
			// O ana kadar istenmiş ses üretme işleri bırakılır.
			cancel() {
				if (worker) worker.postMessage({ cmd: "cancel", upTo: seq });
			},
			// İndirme sürerken okuma durdurulursa indirme de kesilir.
			abort() {
				if (loading) kill();
			},
			reset: kill,
			idle() {
				window.clearTimeout(idleTimer);
				idleTimer = window.setTimeout(() => {
					if (!loading) kill();
				}, IDLE_MS);
			},
			noGpu() {
				remember("gpu", false);
			},
			get build() {
				return build;
			},
			get ready() {
				return !!(loaded && build);
			},
		};
	})();

	// Tarayıcının sesi: cümleler tek tek okunur.
	const browserEngine = (() => {
		let token = 0;
		function stop() {
			token++;
			browserVoice.cancel();
		}
		function play(list, from, rate, h) {
			stop();
			const my = token;
			let i = from;
			const say = () => {
				if (my !== token) return;
				if (i >= list.length) {
					h.onEnd();
					return;
				}
				h.onSentence(i);
				browserVoice.speak(list[i].speech, {
					lang: list[i].lang,
					rate,
					onEnd: () => {
						if (my !== token) return;
						i++;
						say();
					},
					onError: (e) => {
						if (my === token) h.onError(new Error(String(e)));
					},
				});
			};
			say();
		}
		return { available: browserVoice.available, play, stop };
	})();

	/*
	 * Doğal ses: cümleler sırayla üretilip aralıksız çalınır. Üretim, çalan sesin en çok 20 saniye
	 * önünden gider. Vurgu, cümlenin sesi hoparlöre ulaştığında geçer.
	 * Cihaz yavaşsa onSlow bildirilir: tamamlanan cümlelerde üretim gerçek zamanın altında kaldıysa,
	 * ilk ses 8 saniyede gelmediyse ya da okuma sırasında ses toplamda 3 saniyeden uzun beklediyse
	 * (sayfa görünürken). Üretim takılırsa (12 saniye hiç ses gelmezse) onError bildirilir.
	 */
	const emaEngine = (() => {
		const AHEAD = 20;
		const GAP = 0.3;
		const FIRST_AUDIO_MS = 8000;
		const HANG_MS = 12000;
		const MEASURE_SEC = 8;
		const EARLY_SEC = 4;
		const TICK = 80;
		// Tek kelimelik ya da çok kısa cümleler (ör. "Salı", "7") modelde zayıf ve tuhaf sesleniyor; bir
		// sonraki cümleyle birlikte üretilir. Vurgu ikinciye, harf sayısından tahmin edilen anda geçer.
		const SHORT_LETTERS = 10;
		const LETTERS_PER_SEC = 15;
		// Çalmaya başlamadan önce biriktirilen ses (sn). Telefonda ilk cümlelerde ve ses biterse
		// kesik kesik çalmak yerine kısa bir bekleme olur. Hızı ölçülüp yeterli bulunan cihazda kısa tutulur.
		const PREROLL = 1.5;
		const PREROLL_FAST = 0.5;
		// Okuma ortasında ses biterse her seferinde daha uzun biriktirilir (en çok REBUFFER_MAX sn): üretim
		// çalmaya zar zor yetişiyorsa sık ve kısa kesilmeler yerine seyrek bir bekleme olur.
		const REBUFFER_STEP = 1.5;
		const REBUFFER_MAX = 6;
		let token = 0;
		let stats = null; // test modundaki tanı notu için: üretim hızı ve kesilmeler
		let ticker = 0;
		let paused = false;
		let ratedOk = ""; // üretim hızı ölçülüp yeterli bulunan derleme (bu sayfada yeniden ölçülmez)

		const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
		const letters = (t) => (t.match(/[\p{L}\p{N}]/gu) || []).length;
		const isShort = (t) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length <= 1 || letters(t) < SHORT_LETTERS;

		// i'den başlayan üretim işi: kısa cümle, ardından gelenle birleştirilir.
		function job(list, i) {
			const items = [{ i, offset: 0 }];
			let text = list[i].speech;
			let j = i + 1;
			while (j < list.length && isShort(text) && letters(text) + letters(list[j].speech) <= 160) {
				items.push({ i: j, offset: letters(text) });
				text += " " + list[j].speech;
				j++;
			}
			return { text, items, next: j };
		}

		function stop() {
			token++;
			window.clearInterval(ticker);
			ema.cancel();
			player.reset();
		}

		function play(list, from, rate, h) {
			stop();
			const my = token;
			const live = () => my === token;
			const marks = [];
			let shown = from;
			let produced = false;
			let heard = false;
			let inFlight = false;
			let decided = false;
			let quiet = 0; // ilk ses beklenirken geçen süre (ms; sayfa görünür, okuma duraklatılmamış)
			let starve = 0; // üretim sürerken çalacak ses kalmadan geçen süre (ms; aynı koşullarda)
			let audio = 0; // tamamlanan cümlelerin ses süresi (sn)
			let spent = 0; // bunların üretim süresi (sn)
			let jobAudio = 0; // süren işin şimdiye kadarki sesi (sn)
			let jobMs = 0; // süren işte Worker'da geçen süre (ms)
			let stalls = 0; // okuma ortasında sesin bittiği kez
			const speedText = (a, t) => (t > 0 ? (a / t).toFixed(2) + "×" : "?");
			stats = { speed: () => speedText(audio + jobAudio, spent + jobMs / 1000), stalls: () => stalls };
			paused = false;
			player.resume();
			h.onSentence(from);

			const slowNow = (why) => {
				decided = true;
				h.onSlow(why + "; takılma " + player.stalled().toFixed(1) + " sn");
			};
			// Yavaşlık kararı yalnızca üretim hızından verilir. Takılmalar (ör. kısa cümlelerden sonra gelen
			// uzun bir cümlede) cihazın yavaş olduğunu göstermez; onlara karşı tampon biriktirilir.
			const judge = () => {
				if (decided || !live()) return;
				if (!heard && quiet > FIRST_AUDIO_MS) return slowNow("ilk ses " + FIRST_AUDIO_MS / 1000 + " sn'de gelmedi");
				if (ratedOk === ema.build) return undefined;
				// Açıkça yavaş: süren iş dahil en az 4 sn ses, gerçek zamanın %60'ının altında
				const a = audio + jobAudio;
				const t = spent + jobMs / 1000;
				if (a >= EARLY_SEC && a / Math.max(0.001, t) < 0.6) return slowNow("üretim hızı " + speedText(a, t));
				// Tamamlanan cümlelerde en az 8 sn ses, gerçek zamanın altında
				if (audio >= MEASURE_SEC) {
					if (audio / Math.max(0.001, spent) < 1) return slowNow("üretim hızı " + speedText(audio, spent));
					ratedOk = ema.build;
				}
				return undefined;
			};

			// Biriktirme: okumanın başında ve ses biterse parçalar bir süre tutulup birlikte dizilir.
			let holding = true;
			let held = [];
			let heldSec = 0;
			const place = (pcm, ms, wasHeld) => {
				const at = player.push(pcm, wasHeld);
				if (at >= 0) for (const m of ms) marks.push({ i: m.i, at: at + m.dt });
			};
			const target = () => (stalls ? Math.min(REBUFFER_MAX, PREROLL + REBUFFER_STEP * stalls) : ratedOk === ema.build ? PREROLL_FAST : PREROLL);
			const flush = () => {
				for (const x of held) place(x.pcm, x.ms, true);
				held = [];
				heldSec = 0;
				holding = false;
			};
			const deliver = (pcm, ms) => {
				if (!holding && heard && player.ahead() < 0.05) {
					holding = true;
					stalls++;
					player.markStall();
				}
				heard = true;
				starve = 0;
				if (!holding) {
					place(pcm, ms);
					return;
				}
				held.push({ pcm, ms });
				heldSec += pcm.length / 48000;
				if (heldSec >= target()) flush();
			};

			(async () => {
				for (let i = from; i < list.length;) {
					while (live() && player.ahead() > AHEAD) await sleep(300);
					if (!live()) return;
					const w = job(list, i);
					let first = true;
					inFlight = true;
					starve = 0;
					jobAudio = 0;
					jobMs = 0;
					const st = await ema.synth(w.text, rate, player.ahead() < 1.5, (pcm, elapsed) => {
						if (!live()) return;
						const ms = first ? w.items.map((x) => ({ i: x.i, dt: x.offset / LETTERS_PER_SEC / rate })) : [];
						first = false;
						jobAudio += pcm.length / 48000;
						jobMs = elapsed;
						deliver(pcm, ms);
						judge();
					});
					inFlight = false;
					jobAudio = 0;
					jobMs = 0;
					if (!live()) return;
					const sec = Number(st.audioSec) || 0;
					// Biriktirilirken cümle bitince tampon dolmadan çalınmaz (yoksa kısa cümlelerde ses hemen
					// yine biter); son cümlede beklenecek bir şey kalmadığı için çalınır.
					if (sec > 0 && w.next < list.length) {
						if (holding && held.length) {
							held.push({ pcm: new Float32Array(Math.round((GAP / rate) * 48000)), ms: [] });
							heldSec += GAP / rate;
						} else {
							player.gap(GAP / rate);
						}
					}
					if (held.length && (w.next >= list.length || heldSec >= target())) flush();
					audio += sec;
					spent += (Number(st.synthMs) || 0) / 1000;
					judge();
					i = w.next;
				}
				produced = true;
			})().catch((err) => {
				if (!live()) return;
				stop();
				h.onError(err);
			});

			ticker = window.setInterval(() => {
				if (!live()) return;
				if (!paused && !doc.hidden) {
					if (!heard) quiet += TICK;
					if (inFlight && player.ahead() === 0) starve += TICK;
				}
				judge();
				if (!live()) return;
				if (starve > HANG_MS) {
					const err = new Error("Doğal ses üretimi yanıt vermiyor");
					err.code = ema.build === "webgpu" ? "gpu" : "timeout";
					stop();
					h.onError(err);
					return;
				}
				const heardAt = player.now() - player.latency();
				while (marks.length && marks[0].at <= heardAt + 0.05) {
					const m = marks.shift();
					if (m.i !== shown) {
						shown = m.i;
						h.onSentence(m.i);
					}
				}
				// Son hece hoparlörden çıkana kadar beklenir (Bluetooth gecikmesi dahil).
				if (produced && !marks.length && heardAt >= player.end() + 0.05) {
					stop();
					h.onEnd();
				}
			}, TICK);
		}

		return {
			play,
			stop,
			job,
			// Test modundaki tanı notu: üretim hızı (gerçek zamana oranı) ve okuma ortasında sesin kaç kez bittiği
			diag() {
				if (!stats || !ema.build) return "";
				return ema.build + ", üretim " + stats.speed() + ", kesilme " + stats.stalls();
			},
			pause() {
				paused = true;
				player.pause();
				return true;
			},
			resume() {
				paused = false;
				player.resume();
				return true;
			},
		};
	})();

	/*
	 * ---------- hazır ses ----------
	 * Yöneticinin önceden üretip siteye yüklediği ses dosyaları (uploads/gozkulak/). Her dosya bir üretim
	 * birimidir (kısa cümle sonrakiyle birlikte: emaEngine.job). Dosya adı, birimin okunacak metninin
	 * özetidir; önek, biçim, model ya da kodlama değişince bütün adları değiştirir. Birimler, okuyucunun
	 * Türkçe bölümleri ürettiği gibi, her bölümün başından hesaplanır.
	 */
	const prepared = (() => {
		const PREFIX = "gk1|ema-13c431d|opus24|";

		const memo = new Map();

		async function hash(text) {
			if (memo.has(text)) return memo.get(text);
			const d = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(PREFIX + text));
			const out = [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, "0")).join("");
			memo.set(text, out);
			return out;
		}

		// Listenin Türkçe bölümlerindeki birimler: { from, to, text, items } (to hariç; items: emaEngine.job)
		function units(list) {
			const out = [];
			for (let i = 0; i < list.length;) {
				let end = i + 1;
				while (end < list.length && list[end].lang === list[i].lang) end++;
				if (list[i].lang === "tr") {
					const run = list.slice(0, end);
					for (let k = i; k < end;) {
						const w = emaEngine.job(run, k);
						out.push({ from: k, to: w.next, text: w.text, items: w.items });
						k = w.next;
					}
				}
				i = end;
			}
			return out;
		}

		// Okuma listesinde dosyası olan birimler: cümle sırası → { from, to, items, hash }. Hiçbiri yoksa null.
		async function plan(list) {
			if (!PREPARED) return null;
			const files = new Set(AUDIO.files);
			const out = [];
			let any = false;
			try {
				const us = units(list);
				const hs = await Promise.all(us.map((u) => hash(u.text)));
				us.forEach((u, k) => {
					if (!files.has(hs[k])) return;
					const x = { from: u.from, to: u.to, items: u.items, hash: hs[k] };
					for (let i = u.from; i < u.to; i++) out[i] = x;
					any = true;
				});
			} catch (e) {
				return null;
			}
			return any ? out : null;
		}

		return { hash, units, plan };
	})();

	/*
	 * Hazır sesin çalınması: birimler <audio> öğesiyle sırayla çalınır. Web Audio'nun hız ayarı ses
	 * perdesini değiştirdiği için öğe kullanılır; hızlandırmada perde korunur (preservesPitch).
	 * Sıradaki ~20 sn'lik dosyalar önceden indirilir. Vurgu, birleşik birimde ikinci cümleye harf
	 * sayısından tahmin edilen anda geçer (canlı üretimdeki gibi).
	 */
	const preparedEngine = (() => {
		const AHEAD = 20;
		const GAP = 0.3;
		const TICK = 80;
		const LETTERS_PER_SEC = 15;
		const KEEP = 80; // bellekte tutulan dosya sayısı
		const cache = new Map(); // özet → Promise<Blob>
		let plan = [];
		let el = null;
		let url = "";
		let token = 0;
		let ticker = 0;
		let timer = 0;
		let paused = false;
		let speed = 1;
		let waiting = null; // birimler arası boşlukta duraklatıldı: devamda çalınacak birim

		const lettersOf = (t) => (t.match(/[\p{L}\p{N}]/gu) || []).length;

		function element() {
			if (!el) {
				el = new window.Audio();
				el.preload = "auto";
				el.preservesPitch = true;
				el.mozPreservesPitch = true;
				el.webkitPreservesPitch = true;
			}
			return el;
		}

		function fetchUnit(hash) {
			let p = cache.get(hash);
			if (p) return p;
			p = window.fetch(AUDIO.base + hash.slice(0, 2) + "/" + hash + ".ogg", { credentials: "same-origin" }).then((r) => {
				if (!r.ok) throw new Error("Hazır ses dosyası alınamadı (" + r.status + ")");
				return r.blob();
			});
			p.catch(() => cache.delete(hash));
			cache.set(hash, p);
			if (cache.size > KEEP) cache.delete(cache.keys().next().value);
			return p;
		}

		function stop() {
			token++;
			window.clearInterval(ticker);
			window.clearTimeout(timer);
			timer = 0;
			waiting = null;
			if (el) {
				el.onended = null;
				el.onerror = null;
				el.pause();
				el.removeAttribute("src");
				el.load();
			}
			if (url) window.URL.revokeObjectURL(url);
			url = "";
		}

		function play(list, from, rate, h) {
			stop();
			const my = token;
			const live = () => my === token;
			speed = rate;
			paused = false;
			// from'dan başlayan, dosyası olan ardışık birimler (from bir birimin ortasındaysa o birimden)
			const units = [];
			for (let i = from; i < list.length && plan[i];) {
				units.push(plan[i]);
				i = plan[i].to;
			}
			let k = 0;
			let marks = [];
			const fail = (err) => {
				if (!live()) return;
				stop();
				h.onError(err);
			};
			const prefetch = () => {
				let sec = 0;
				for (let j = k; j < units.length && sec < AHEAD; j++) {
					fetchUnit(units[j].hash).catch(() => {});
					sec += lettersOf(list.slice(units[j].from, units[j].to).map((x) => x.speech).join(" ")) / LETTERS_PER_SEC;
				}
			};
			const begin = async () => {
				waiting = null;
				if (!live()) return;
				if (k >= units.length) {
					stop();
					h.onEnd();
					return;
				}
				const u = units[k];
				prefetch();
				let blob;
				try {
					blob = await fetchUnit(u.hash);
				} catch (err) {
					fail(err);
					return;
				}
				if (!live()) return;
				const a = element();
				if (url) window.URL.revokeObjectURL(url);
				url = window.URL.createObjectURL(blob);
				a.src = url;
				a.defaultPlaybackRate = speed;
				a.playbackRate = speed;
				marks = u.items.map((x) => ({ i: x.i, at: x.offset / LETTERS_PER_SEC }));
				a.onerror = () => fail(new Error("Hazır ses çalınamadı"));
				a.onended = () => {
					if (!live()) return;
					k++;
					if (k >= units.length) {
						begin();
						return;
					}
					waiting = begin;
					timer = window.setTimeout(() => {
						timer = 0;
						if (!paused && waiting) waiting();
					}, (GAP / speed) * 1000);
				};
				if (!paused) a.play().catch(fail);
			};
			h.onSentence(units.length ? units[0].from : from);
			begin();
			ticker = window.setInterval(() => {
				if (!live() || !el) return;
				while (marks.length && marks[0].at <= el.currentTime + 0.05) {
					const m = marks.shift();
					h.onSentence(m.i);
				}
			}, TICK);
		}

		return {
			play,
			stop,
			use(p) {
				plan = p || [];
			},
			// Ses çıkışı ziyaretçinin dokunuşu içinde hazırlanır (iOS).
			unlock() {
				element();
			},
			pause() {
				paused = true;
				window.clearTimeout(timer);
				timer = 0;
				if (el) el.pause();
				return true;
			},
			resume() {
				paused = false;
				if (waiting) {
					waiting();
					return true;
				}
				if (el && el.getAttribute("src") && el.paused && !el.ended) el.play().catch(() => {});
				return true;
			},
			// Hız değişince birim baştan okunmaz; öğenin hızı değişir.
			rate(r) {
				speed = r;
				if (el) {
					el.defaultPlaybackRate = r;
					el.playbackRate = r;
				}
				return true;
			},
		};
	})();

	/*
	 * ---------- okuyucu ----------
	 * Cümleleri sırayla sese verir, okunanı vurgular; duraklatma, devam, önceki/sonraki cümle ve hız.
	 * Türkçe cümleler, ziyaretçi kapatmadıysa doğal sesle okunur; dosyalar önbellekte değilse önce
	 * indirme onayı istenir. Başka dildeki bölümler (lang="en" gibi) tarayıcının o dildeki sesiyle
	 * okunur. Doğal ses yüklenemezse ya da cihazda yavaş kalırsa okuma tarayıcının sesiyle sürer.
	 */
	const reader = (() => {
		let queue = [];
		let index = 0;
		let state = "idle"; // idle | asking | loading | playing | paused
		let engine = null;
		let natural = false; // bu okumada doğal ses motoru hazır
		let voiceOk = {}; // dil → tarayıcının o dilde sesi var mı
		let run = 0;
		let fresh = false; // duraklatılmışken cümle, hız ya da ses değişti: devamda cümlenin başından okunur
		let message = "";
		let note = "";
		let progress = null;
		let consent = false; // bu sayfada indirme onaylandı
		let broken = false; // bu sayfada doğal ses yüklenemedi
		let gpuRetried = false; // WebGPU sorunu yüzünden WASM'a bir kez geçildi
		let browserOk = true; // onay sorulurken: tarayıcının Türkçe sesi var mı
		let plan = null; // cümle sırası → hazır birim (prepared.plan); yoksa null
		let preparedOff = false; // bu sayfada hazır ses çalınamadı
		const listeners = new Set();

		const emit = () => listeners.forEach((fn) => fn());
		const rate = () => RATES[prefs.ttsRate] || 1;
		const wantsNatural = () => NATURAL && prefs.naturalVoice && !broken;
		const wantsPrepared = () => PREPARED && prefs.naturalVoice && !preparedOff;
		const ready = (i) => !!(plan && plan[i]);
		const warn = (err) => window.console.warn("GözKulak: " + ((err && err.message) || err));
		const clamp = (i) => Math.max(0, Math.min(queue.length - 1, i));
		// Test modunda (yalnızca yöneticiler) geçişin teknik nedeni notun sonunda gösterilir: telefonda konsol yok.
		const why = (text, detail) => (cfg.testMode && detail ? text + " (Tanı: " + detail + ")" : text);

		function say(text) {
			message = text;
			emit();
			announce(text);
		}

		// Aynı dildeki ardışık cümleler aynı sesle okunur; dil değişince ses de değişir. Türkçede hazır
		// sesi olan ve olmayan bölümler de ayrı okunur.
		function runEnd(from) {
			const l = queue[from].lang;
			const r = ready(from);
			let i = from + 1;
			while (i < queue.length && queue[i].lang === l && ready(i) === r) i++;
			return i;
		}

		function engineFor(i) {
			const l = queue[i].lang;
			if (l === "tr" && ready(i)) return preparedEngine;
			if (natural && l === "tr") return emaEngine;
			if (voiceOk[l]) return browserEngine;
			// Tarayıcının o dilde sesi yoksa doğal ses okur (hiç okunmamasından iyidir).
			return natural ? emaEngine : null;
		}

		const handlers = (my, end) => ({
			onSentence(i) {
				if (my !== run || !queue[i]) return;
				index = i;
				readMark.show(queue[i]);
				emit();
			},
			onEnd() {
				if (my !== run) return;
				if (end < queue.length) {
					index = end;
					play();
				} else {
					finish();
				}
			},
			onError(err) {
				if (my === run) failed(err);
			},
			onSlow(detail) {
				if (my === run) slow(detail);
			},
		});

		function play() {
			const my = ++run;
			fresh = false;
			message = "";
			if (engine) engine.stop();
			let next = engineFor(index);
			// Sesi olmayan dildeki bölüm atlanır.
			while (!next) {
				const skip = runEnd(index);
				if (skip >= queue.length) {
					finish();
					return;
				}
				index = skip;
				next = engineFor(index);
			}
			engine = next;
			state = "playing";
			const end = runEnd(index);
			engine.play(end < queue.length ? queue.slice(0, end) : queue, index, rate(), handlers(my, end));
			emit();
		}

		// Okumayı hazırlar ve başlatır. keepPaused: okuma duraklatılmışken ses değiştiyse duraklatılmış kalır.
		async function start(list, from, keepPaused) {
			halt();
			const my = run;
			message = "";
			note = "";
			natural = false;
			emit();
			if (!list || !list.length) {
				say(STR.ttsNothing);
				return;
			}
			queue = list;
			index = clamp(from || 0);
			// Ses çıkışı ziyaretçinin dokunuşu içinde açılmalı: ilk beklemeden önce.
			const usePrepared = wantsPrepared();
			if (usePrepared) preparedEngine.unlock();
			const audioOk = wantsNatural() && queue.slice(index).some((x) => x.lang === "tr") && player.unlock();
			plan = usePrepared ? await prepared.plan(queue) : null;
			if (my !== run) return;
			preparedEngine.use(plan);
			// Okuma hazır bir birimin ortasından başlıyorsa birimin başından okunur.
			if (ready(index)) index = plan[index].from;
			const rest = queue.slice(index);
			// Model yalnızca hazır sesi olmayan Türkçe cümle varsa gerekir (o zaman onay da sorulur).
			let needNatural = audioOk && rest.some((x, k) => x.lang === "tr" && !ready(index + k));
			if (needNatural) {
				state = "loading";
				emit();
			}
			voiceOk = {};
			// Tarayıcının sesi yalnızca hazır sesi olmayan cümlelerin dilleri için sorulur.
			for (const l of new Set(rest.filter((x, k) => !ready(index + k)).map((x) => x.lang))) {
				voiceOk[l] = await browserEngine.available(l);
				if (my !== run) return;
			}
			if (needNatural) {
				const ok = await prepareNatural(my);
				if (ok === null) return; // onay soruluyor ya da okuma değişti
				natural = ok;
			}
			if (!natural && !rest.some((x, k) => voiceOk[x.lang] || ready(index + k))) {
				const failedNatural = needNatural;
				halt();
				say(failedNatural ? STR.ttsNaturalNone : STR.ttsNoVoice);
				return;
			}
			progress = null;
			if (keepPaused) {
				state = "paused";
				fresh = true;
				readMark.show(queue[index]);
				emit();
			} else {
				play();
			}
		}

		// Doğal sesi yükler: true (hazır), false (yüklenemedi), null (onay soruluyor ya da okuma değişti).
		async function prepareNatural(my) {
			try {
				if (!consent && !ema.ready) {
					const p = await ema.probe();
					if (my !== run) return null;
					if (!p.ok) throw new Error("Bu tarayıcıda doğal ses çalışmıyor: " + (p.reason || ""));
					if (!p.cached) return ask();
				}
				await ema.load(consent, (pr) => {
					if (my !== run) return;
					progress = pr;
					emit();
				});
				return my === run ? true : null;
			} catch (err) {
				if (my !== run) return null;
				// Gereken dosyalardan biri önbellekte yok (ör. WebGPU'dan WASM'a geçildi): önce onay.
				if (err && err.code === "consent") return ask();
				warn(err);
				broken = true;
				ema.reset();
				if (voiceOk.tr) {
					note = why(STR.ttsNaturalFailed, err && err.message);
					announce(STR.ttsNaturalFailed);
				}
				return false;
			}
		}

		function ask() {
			browserOk = !!voiceOk.tr;
			state = "asking";
			progress = null;
			emit();
			return null;
		}

		// Doğal ses okurken sorun çıktı: WebGPU ise WASM ile, değilse tarayıcının sesiyle sürer.
		function failed(err) {
			warn(err);
			const wasPaused = state === "paused";
			// Hazır ses çalınamadı: bu sayfada hazır ses bırakılır, okuma bulunduğu cümleden sürer.
			if (engine === preparedEngine) {
				preparedOff = true;
				engine.stop();
				start(queue, index, wasPaused);
				return;
			}
			if (engine !== emaEngine) {
				if (engine) engine.stop();
				state = "paused";
				fresh = true;
				say(STR.ttsError);
				return;
			}
			if (err && err.code === "gpu" && !gpuRetried) {
				gpuRetried = true;
				ema.noGpu();
				ema.reset();
				start(queue, index, wasPaused);
				return;
			}
			broken = true;
			ema.reset();
			toBrowser(STR.ttsNaturalBroke, wasPaused, err && err.message);
		}

		function slow(detail) {
			const wasPaused = state === "paused";
			if (ema.build === "webgpu" && !gpuRetried) {
				gpuRetried = true;
				ema.noGpu();
				ema.reset();
				start(queue, index, wasPaused);
				return;
			}
			// Tarayıcının Türkçe sesi yoksa doğal sesle sürer (yavaş da olsa okunur).
			if (!voiceOk.tr) return;
			// Faz 0 kararı: bu cihazda tarayıcının sesi kullanılır ve bu, ziyaretçinin tarayıcısında
			// hatırlanır ("Doğal ses" seçeneği kapanır; ziyaretçi yeniden açabilir).
			warn("doğal ses yavaş: " + detail);
			prefs.naturalVoice = false;
			savePrefs();
			ema.reset();
			toBrowser(STR.ttsSlow, wasPaused, detail);
		}

		// Okuma bulunduğu cümleden tarayıcının sesiyle sürer; duraklatılmışsa duraklatılmış kalır.
		function toBrowser(text, wasPaused, detail) {
			if (engine) engine.stop();
			engine = null;
			natural = false;
			run++;
			if (!queue.slice(index).some((x, k) => voiceOk[x.lang] || ready(index + k))) {
				state = "paused";
				fresh = true;
				say(STR.ttsNaturalNone);
				return;
			}
			note = why(text, detail);
			announce(text);
			if (wasPaused || state === "paused") {
				state = "paused";
				fresh = true;
				emit();
			} else {
				play();
			}
		}

		function pause() {
			if (state !== "playing") return;
			state = "paused";
			if (!(engine && engine.pause && engine.pause())) {
				if (engine) engine.stop();
				fresh = true;
			}
			emit();
		}

		function resume() {
			if (state !== "paused") return;
			if (fresh || !engine || !engine.resume) {
				play();
				return;
			}
			state = "playing";
			engine.resume();
			emit();
		}

		// Okumayı sessizce sonlandırır (yeni bir okumadan önce de çağrılır). Ziyaretçi durdurduysa
		// süren indirme de kesilir; yeni bir okumaya geçiliyorsa indirme sürer.
		function halt(abort) {
			run++;
			if (abort && state === "loading") ema.abort();
			if (engine) engine.stop();
			engine = null;
			readMark.clear();
			state = "idle";
			queue = [];
			index = 0;
			plan = null;
			progress = null;
			fresh = false;
		}

		function stop() {
			if (state === "idle") return;
			halt(true);
			message = "";
			note = "";
			player.pause();
			ema.idle();
			emit();
		}

		function finish() {
			halt();
			note = "";
			player.pause();
			ema.idle();
			emit();
			announce(STR.ttsDone);
		}

		function step(delta) {
			if (state !== "playing" && state !== "paused") return;
			if (engine) engine.stop();
			let to = clamp(index + delta);
			// Hazır seste birimin ortasına gidilmez: ileri sonraki birime, geri birimin başına.
			if (ready(to) && plan[to].from !== to) to = delta > 0 && plan[to].to < queue.length ? plan[to].to : plan[to].from;
			index = to;
			if (state === "playing") play();
			else {
				fresh = true;
				readMark.show(queue[index]);
				emit();
			}
		}

		function rateChanged() {
			if ((state === "playing" || state === "paused") && engine === preparedEngine && !fresh) {
				engine.rate(rate());
				return;
			}
			if (state === "playing") play();
			else if (state === "paused") {
				if (engine) engine.stop();
				fresh = true;
			}
		}

		// "Doğal ses" seçeneği değişti: okuma sürüyorsa bulunduğu cümleden yeni sesle sürer.
		function voiceChanged() {
			if (prefs.naturalVoice) broken = false;
			if (state === "idle") return;
			const wasPaused = state === "paused";
			if (state === "loading") ema.abort();
			start(queue, index, wasPaused);
		}

		// Sayfadan ayrılınca okuma durur (bazı tarayıcılar sesi sonraki sayfada da sürdürüyor).
		window.addEventListener("pagehide", () => {
			if (state === "idle") return;
			halt(true);
			player.pause();
			emit();
		});

		return {
			start,
			pause,
			resume,
			stop,
			step,
			rateChanged,
			voiceChanged,
			// İndirme onayı: "İndir ve dinle"
			accept() {
				if (state !== "asking") return;
				consent = true;
				start(queue, index);
			},
			// Onay kutusundaki diğer seçim (tarayıcının sesiyle) sonrasında okumayı yeniden başlatır.
			retry() {
				if (state === "asking") start(queue, index);
			},
			on: (fn) => listeners.add(fn),
			get state() {
				return state;
			},
			get position() {
				return queue.length ? [index + 1, queue.length] : [0, 0];
			},
			get message() {
				return message;
			},
			get note() {
				return note;
			},
			get browserOk() {
				return browserOk;
			},
			get progress() {
				return progress;
			},
			get natural() {
				return (engine === emaEngine || engine === preparedEngine) && (state === "playing" || state === "paused");
			},
			get diag() {
				if (!cfg.testMode) return "";
				if (engine === preparedEngine) return "hazır ses";
				return engine === emaEngine ? emaEngine.diag() : "";
			},
		};
	})();

	/*
	 * Tıklayarak dinleme: açıkken sayfadaki bir metne tıklanınca okuma oradan başlar. Bağlantılar,
	 * düğmeler ve form alanları her zamanki gibi çalışır; metin seçmek için sürükleme okumayı başlatmaz.
	 */
	const clickRead = (() => {
		let on = false;
		function onClick(e) {
			if (e.button !== 0 || e.defaultPrevented) return;
			const t = e.target;
			if (!t || t.nodeType !== 1 || e.composedPath().includes(rootHost)) return;
			if (t.closest("a[href], button, input, select, textarea, label, summary, [role='button'], [role='link'], [contenteditable='true'], gozkulak-overlay")) return;
			const sel = window.getSelection && window.getSelection();
			if (sel && !sel.isCollapsed && sel.toString().trim()) return;
			const found = content.fromPoint(e.clientX, e.clientY);
			if (found) reader.start(found.list, found.at);
		}
		return {
			set(next) {
				if (next === on) return;
				on = next;
				if (on) doc.addEventListener("click", onClick, true);
				else doc.removeEventListener("click", onClick, true);
			},
		};
	})();

	/*
	 * ---------- okuma maskesi ve cetveli ----------
	 * Ayrı bir katmandır; tıklamalar ve dokunuşlar altındaki sayfaya geçer.
	 * Fareyle imleci, klavyeyle odaklanan öğeyi izler. Dokunmatik ekranda katman ekranda sabit kalır,
	 * içerik altından kaydırılır; yeri sağ kenardaki tutamaçla sürüklenerek değiştirilir. Böylece
	 * katmanı taşımak için sayfaya dokunmak (ve istemeden bir bağlantıya basmak) gerekmez.
	 */
	const overlay = (() => {
		const BAND = 140;
		let host = null;
		let top;
		let bottom;
		let guide;
		let grip;
		let mode = null;
		let y = Math.round(window.innerHeight * 0.4);
		let frame = 0;
		let lastPointer = 0;
		let drag = null;
		const coarse = () => window.matchMedia && window.matchMedia("(any-pointer: coarse)").matches;

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
			grip = h("div", { class: "gk-grip", "aria-hidden": "true", hidden: true }, icon("grip"));
			grip.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				drag = { id: e.pointerId, dy: e.clientY - y };
				grip.setPointerCapture(e.pointerId);
				grip.classList.add("gk-grip-on");
			});
			grip.addEventListener("pointermove", (e) => {
				if (drag && e.pointerId === drag.id) moveTo(e.clientY - drag.dy);
			});
			const release = (e) => {
				if (!drag || e.pointerId !== drag.id) return;
				drag = null;
				grip.classList.remove("gk-grip-on");
			};
			grip.addEventListener("pointerup", release);
			grip.addEventListener("pointercancel", release);
			root.append(h("link", { rel: "stylesheet", href: cfg.css }), top, bottom, guide, grip);
		}

		function draw() {
			frame = 0;
			if (!host) return;
			top.style.height = Math.max(0, y - BAND / 2) + "px";
			bottom.style.top = Math.max(0, y + BAND / 2) + "px";
			guide.style.top = Math.max(0, y - 5) + "px";
			grip.style.top = Math.round(y - 22) + "px";
		}

		function moveTo(next) {
			y = Math.max(22, Math.min(window.innerHeight - 22, next));
			if (!frame) frame = window.requestAnimationFrame(draw);
		}

		// Yalnızca fare ve kalem izlenir; parmak hareketi sayfayı kaydırır, katmanı oynatmaz.
		const onPointer = (e) => {
			if (e.pointerType === "mouse" || e.pointerType === "pen") moveTo(e.clientY);
		};
		const onPointerDown = (e) => {
			lastPointer = Date.now();
			if (e.pointerType === "touch" && grip.hidden) grip.hidden = false;
		};
		// Odak yalnızca klavyeyle gelindiğinde izlenir (dokunarak odaklanan bağlantı katmanı oynatmaz).
		const onFocus = (e) => {
			if (Date.now() - lastPointer < 800) return;
			const target = e.composedPath ? e.composedPath()[0] : e.target;
			if (!target || !target.getBoundingClientRect || (rootHost && rootHost.contains(target))) return;
			const r = target.getBoundingClientRect();
			moveTo(r.top + r.height / 2);
		};
		const onResize = () => moveTo(y);

		function set(next) {
			if (next === mode) return;
			mode = next;
			if (!mode) {
				if (host) host.remove();
				drag = null;
				doc.removeEventListener("pointermove", onPointer);
				doc.removeEventListener("pointerdown", onPointerDown, true);
				doc.removeEventListener("focusin", onFocus);
				window.removeEventListener("resize", onResize);
				return;
			}
			if (!host) build();
			top.hidden = bottom.hidden = mode !== "mask";
			guide.hidden = mode !== "guide";
			if (coarse()) grip.hidden = false;
			if (!host.isConnected) doc.body.append(host);
			doc.addEventListener("pointermove", onPointer, { passive: true });
			doc.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
			doc.addEventListener("focusin", onFocus);
			window.addEventListener("resize", onResize, { passive: true });
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
		if (SPEECH) clickRead.set(!!prefs.clickRead);
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
	// Panelin ekrana sığması için kenar uzaklıkları da stil sayfasına aktarılır.
	hs.setProperty("--gk-ox", x);
	hs.setProperty("--gk-oy", position.startsWith("bottom") ? yOff : "0px");
	if (position.endsWith("right")) hs.setProperty("right", x);
	else hs.setProperty("left", x);
	if (position.startsWith("bottom")) {
		hs.setProperty("bottom", yOff);
	} else {
		// transform kullanılmaz: dar ekranda panel ekrana göre konumlanabilsin (position: fixed).
		hs.setProperty("top", "calc(50% - " + size / 2 + "px)");
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

	function tile(key, iconName, label, after) {
		const multi = typeof DEFAULTS[key] === "number";
		// Aç/kapa kutularında durum aria-pressed ile bildirilir; görünen "Açık/Kapalı" yazısı ekran
		// okuyucuda tekrar okunmasın. Düzeyli kutularda (satır/harf aralığı) düzeyin adı okunur.
		const state = h("span", { class: "gk-tile-state", "aria-hidden": multi ? null : "true" });
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
			if (after) after();
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
		const value = h("span", { class: "gk-step-value" });
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

	// ---------- sesli okuma: panel bölümü ve küçük oynatıcı ----------
	const speechUi = (() => {
		if (!SPEECH) return null;
		const control = (cls, label, iconName, fn) => {
			const b = h("button", { type: "button", class: cls, "aria-label": label }, icon(iconName));
			b.addEventListener("click", fn);
			return b;
		};
		const setIcon = (btn, name) => btn.replaceChildren(icon(name));
		const busyState = (st) => st === "playing" || st === "paused";

		function toggle() {
			const st = reader.state;
			if (st === "playing") reader.pause();
			else if (st === "paused") reader.resume();
			else if (st === "loading" || st === "asking") reader.stop();
			else {
				const picked = content.selection();
				reader.start(picked.length ? picked : content.page(), 0);
			}
		}

		// Panel
		const playIcon = h("span", { class: "gk-play-icon" });
		const playLabel = h("span", { class: "gk-play-label" });
		const play = h("button", { type: "button", class: "gk-play" }, playIcon, playLabel);
		play.addEventListener("click", toggle);
		const prev = control("gk-ctl", STR.ttsPrev, "prev", () => reader.step(-1));
		const next = control("gk-ctl", STR.ttsNext, "next", () => reader.step(1));
		const stop = control("gk-ctl", STR.ttsStop, "stop", () => reader.stop());
		const status = h("p", { class: "gk-tts-status" });
		const noteLine = h("p", { class: "gk-tts-note", hidden: true });
		const bar = h("progress", { class: "gk-tts-progress", max: "100", value: "0", "aria-label": STR.ttsProgress, hidden: true });

		const rateValue = h("span", { class: "gk-step-value gk-rate-value" });
		const slower = h("button", { type: "button", class: "gk-step-btn", "aria-label": STR.ttsSlower }, "−");
		const faster = h("button", { type: "button", class: "gk-step-btn gk-step-up", "aria-label": STR.ttsFaster }, "+");
		const changeRate = (delta) => {
			const nextRate = Math.max(0, Math.min(MAX.ttsRate, prefs.ttsRate + delta));
			if (nextRate === prefs.ttsRate) return;
			prefs.ttsRate = nextRate;
			update("ttsRate");
			reader.rateChanged();
			announce(STR.ttsRate + ": " + STR.rates[prefs.ttsRate]);
		};
		slower.addEventListener("click", () => changeRate(-1));
		faster.addEventListener("click", () => changeRate(1));
		const rateRow = h("div", { class: "gk-step", role: "group", "aria-labelledby": "gk-rate-label" },
			h("span", { id: "gk-rate-label", class: "gk-step-label", text: STR.ttsRate }),
			h("span", { class: "gk-step-controls" }, slower, rateValue, faster));

		// İlk kullanımda indirme onayı (dosyalar önbellekte değilse)
		const askYes = h("button", { type: "button", class: "gk-ask-yes", text: STR.ttsAskYes });
		const askNo = h("button", { type: "button", class: "gk-ask-no", text: STR.ttsAskBrowser });
		askYes.addEventListener("click", () => reader.accept());
		askNo.addEventListener("click", () => {
			// Tarayıcının kendi sesi yoksa bu düğme "Vazgeç"tir.
			if (!reader.browserOk) {
				reader.stop();
				return;
			}
			prefs.naturalVoice = false;
			update("naturalVoice");
			reader.retry();
		});
		const ask = h("div", { class: "gk-ask", role: "group", "aria-labelledby": "gk-ask-text", hidden: true },
			h("p", { id: "gk-ask-text", class: "gk-ask-text", text: STR.ttsAskText }),
			h("div", { class: "gk-ask-row" }, askYes, askNo));
		let asking = false;

		const tiles = h("div", { class: "gk-grid" }, tile("clickRead", "speaker", STR.clickRead));
		if (NATURAL || PREPARED) tiles.append(tile("naturalVoice", "voice", STR.naturalVoice, () => reader.voiceChanged()));

		const section = h("section", { class: "gk-group gk-speech", "aria-labelledby": "gk-g-speech" },
			h("h3", { id: "gk-g-speech", class: "gk-group-title", text: STR.ttsTitle }),
			h("div", { class: "gk-tts-row" }, play, prev, next, stop),
			ask,
			bar,
			status,
			noteLine,
			rateRow,
			tiles);

		// Panel kapalıyken okuma sürerse düğmenin üstünde küçük bir oynatıcı görünür.
		const miniPrev = control("gk-mini-btn", STR.ttsPrev, "prev", () => reader.step(-1));
		const miniPlay = control("gk-mini-btn", STR.ttsPause, "pause", toggle);
		const miniNext = control("gk-mini-btn", STR.ttsNext, "next", () => reader.step(1));
		const miniPos = h("span", { class: "gk-mini-pos", "aria-live": "off" });
		const mini = h("div", { class: "gk-mini", role: "group", "aria-label": STR.ttsTitle, hidden: true },
			miniPrev,
			miniPlay,
			miniNext,
			control("gk-mini-btn", STR.ttsStop, "stop", () => reader.stop()),
			miniPos);

		function percent() {
			const p = reader.progress;
			return p && p.total > 0 && p.done < p.total ? Math.floor((p.done / p.total) * 100) : -1;
		}

		function statusText(st) {
			if (reader.message) return reader.message;
			const [at, total] = reader.position;
			if (st === "loading") {
				const pc = percent();
				return pc >= 0 ? STR.ttsDownloading.replace("%1", String(pc)) : STR.ttsPreparing;
			}
			if (!busyState(st)) return STR.ttsHint;
			return (st === "paused" ? STR.ttsPaused : STR.ttsPos).replace("%1", at).replace("%2", total);
		}

		// Doğal sesle okunurken "yapay zekâ ile üretilmiştir" notu; tarayıcı sesine geçildiyse nedeni.
		function noteText(st) {
			if (!busyState(st) || reader.message) return "";
			const dg = reader.diag;
			return [reader.natural ? STR.ttsAiNote : "", reader.note, dg ? "(Tanı: " + dg + ")" : ""].filter(Boolean).join(" ");
		}

		function render() {
			const st = reader.state;
			const [at, total] = reader.position;
			const busy = busyState(st);
			const waiting = st === "loading" || st === "asking";
			setIcon(playIcon, st === "playing" ? "pause" : waiting ? "stop" : "play");
			playLabel.textContent = st === "playing" ? STR.ttsPause : st === "paused" ? STR.ttsResume : waiting ? STR.ttsCancel : STR.ttsListen;
			for (const b of [prev, next, stop]) b.hidden = !busy;
			status.textContent = statusText(st);
			status.hidden = st === "asking";
			const nt = noteText(st);
			noteLine.textContent = nt;
			noteLine.hidden = !nt;
			const pc = st === "loading" ? percent() : -1;
			bar.hidden = pc < 0;
			if (pc >= 0) bar.value = pc;
			rateValue.textContent = STR.rates[prefs.ttsRate];
			slower.disabled = prefs.ttsRate === 0;
			faster.disabled = prefs.ttsRate === MAX.ttsRate;

			// Onay kutusu: açılınca panel görünür olur ve odak "İndir ve dinle"ye geçer; kapanınca
			// (seçim yapıldı) odak okuma düğmesine döner, kaybolmaz.
			const wasAsking = asking;
			const focusInAsk = ask.contains(shadow.activeElement);
			asking = st === "asking";
			ask.hidden = !asking;
			askNo.textContent = reader.browserOk ? STR.ttsAskBrowser : STR.ttsAskCancel;
			if (asking && !wasAsking) {
				if (!isOpen()) open();
				askYes.focus();
			} else if (wasAsking && !asking && focusInAsk) {
				play.focus();
			}

			setIcon(miniPlay, st === "playing" ? "pause" : waiting ? "stop" : "play");
			miniPlay.setAttribute("aria-label", st === "playing" ? STR.ttsPause : waiting ? STR.ttsCancel : STR.ttsResume);
			miniPrev.hidden = !busy;
			miniNext.hidden = !busy;
			miniPos.textContent = busy ? at + " / " + total : pc >= 0 ? (lang === "tr" ? "%" + pc : pc + "%") : waiting ? "…" : "";
			mini.hidden = st === "idle" || isOpen();
			const miniName = reader.natural ? STR.ttsTitle + " · " + STR.ttsAiNote : STR.ttsTitle;
			mini.setAttribute("aria-label", miniName);
			mini.setAttribute("title", miniName);
		}
		reader.on(() => {
			// Tercihler okuyucu tarafından değişmiş olabilir (ör. yavaş cihazda doğal ses kapatıldı).
			for (const c of Object.values(controls)) c.render();
			resetButton.disabled = isDefault(prefs);
			render();
		});

		return { section, mini, render };
	})();

	const body = h("div", { class: "gk-body" });
	if (cfg.testMode) body.append(h("p", { class: "gk-test", text: STR.test }));
	if (cfg.version !== SCRIPT_VERSION) {
		const msg = STR.stale.replace("%1", SCRIPT_VERSION).replace("%2", String(cfg.version));
		if (cfg.testMode) body.append(h("p", { class: "gk-test", text: msg }));
		window.console.warn("GözKulak: " + msg);
	}
	if (speechUi) body.append(speechUi.section);
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
		if (speechUi) speechUi.render();
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
		if (speechUi) speechUi.render();
		title.focus();
	}

	function close(returnFocus) {
		if (!isOpen()) return;
		panel.hidden = true;
		button.setAttribute("aria-expanded", "false");
		if (speechUi) speechUi.render();
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
	// Klavye odağı menüden çıkınca panel kapanır (sayfanın üstünde açık kalıp içeriği örtmesin).
	doc.addEventListener("focusin", (e) => {
		if (isOpen() && !e.composedPath().includes(rootHost)) close(false);
	});
	doc.addEventListener("keydown", (e) => {
		if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === SHORTCUT.code) {
			e.preventDefault();
			if (isOpen()) close(true);
			else open();
		}
	});

	shadow.append(sheet, panel);
	if (speechUi) shadow.append(speechUi.mini);
	shadow.append(button, live);

	// Kayıtlı tercihler sayfa açılır açılmaz uygulanır.
	// Menü sayfanın en başına eklenir: klavyeyle gelen ziyaretçi ilk sekmede menü düğmesine ulaşır.
	const start = () => {
		doc.body.prepend(rootHost);
		applyAll();
		render();
		window.GozKulak = {
			version: cfg.version,
			script: SCRIPT_VERSION,
			open,
			close: () => close(false),
			reset: () => resetButton.click(),
			// Tanı için: bir metnin nasıl okunacağı ve bu sayfada okunacak cümleler
			prepare: (text, language) => (language === "en" ? speechText.en(text) : speechText.tr(text)),
			sentences: () => content.page().map((x) => ({ text: x.text, speech: x.speech, lang: x.lang })),
			// Hazır ses: bu sayfanın üretim birimleri ve dosya adları (yönetici panelindeki hazırlama kullanır)
			units: () => Promise.all(prepared.units(content.page()).map(async (u) => ({ text: u.text, hash: await prepared.hash(u.text) }))),
		};
	};
	if (doc.body) start();
	else doc.addEventListener("DOMContentLoaded", start, { once: true });
})();

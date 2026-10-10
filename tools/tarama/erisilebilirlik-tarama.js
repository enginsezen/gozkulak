/*
 * GözKulak — sitenin kendi erişilebilirlik eksiklerinin hızlı taraması (Faz 1.3)
 *
 * Kullanım:
 *   1. Taranacak siteyi yönetici olarak açın (hangi sayfa olduğu önemli değil).
 *   2. Tarayıcı konsolunu açın (F12 → Console), bu dosyanın tamamını yapıştırıp Enter'a basın.
 *   3. Betik sitenin örnek sayfalarını görünmez bir çerçevede sırayla açar ve tarar (sayfa başına
 *      birkaç saniye). Bitince sağ altta bir rapor penceresi açılır; "Kopyala" ile alıp gönderin.
 *
 * Betik yalnızca okur: sitede hiçbir şeyi değiştirmez, hiçbir yere veri göndermez. Tarama süresince
 * GözKulak tercihleriniz (koyu mod vb.) geçici olarak kaldırılır ve sonunda geri yüklenir; böylece
 * renkler sitenin kendi renkleriyle ölçülür.
 *
 * Denetlenenler: sayfa dili ve başlığı, yakınlaştırma engeli, ana bölge, görsel alt metinleri,
 * adsız bağlantı ve düğmeler, belirsiz bağlantı metinleri, form etiketleri, başlık sırası,
 * renk kontrastı (yaklaşık), başlıksız iframe'ler, ARIA hataları, tekrarlı kimlikler.
 * Bu bir otomatik ön taramadır; ekran okuyucu ve klavye testinin yerini tutmaz.
 */
(async () => {
	"use strict";

	// Sitelerin örnek sayfaları (proje belgesindeki liste). Başka bir sitede yalnızca açık sayfa taranır.
	// Elle liste vermek için betikten önce: window.GK_TARAMA_SAYFALAR = ["/", "/iletisim/"];
	const PAGES = {
		"karabuk78.com": ["/", "/kesfet/", "/yazilar/", "/arasta-carsisi-yemeniciler-arastasi-safranbolunun-tarihi-carsisi/", "/hakkimizda/", "/rehber/kaymakamlar-gezi-evi/", "/rehber/lati-gida-safranbolu/"],
		"sezen.pro": ["/", "/hizmetler/", "/hakkimizda/", "/kvkk-aydinlatma-metni/"],
		"mzademiryolu.com": ["/", "/hakkimizda/", "/demiryolu-makasi-imalati/", "/en/mza-railway-machinery/", "/en/about-us/", "/en/railway-turnouts-manufacturing/"],
	};
	const SETTLE_MS = 2500;
	const MAX_EXAMPLES = 4;
	const SKIP_SEL = "#wpadminbar, gozkulak-root, gozkulak-overlay, #query-monitor-main, noscript, template";
	const VAGUE = /^(tıkla|tıklayın|buraya|buraya tıkla|buraya tıklayın|devam|devamı|devamını oku|devamını okuyun|daha fazla|daha fazlası|daha fazla bilgi|daha fazla bilgi edin|detay|detaylar|detaylı bilgi|incele|oku|tümü|bağlantı|link|click here|here|more|read more|learn more|details|view more)$/;
	const GENERIC_ALT = /^(resim|görsel|fotoğraf|foto|image|img|photo|picture|logo|banner|icon|ikon|simge)$/;
	const FILE_ALT = /(\.(jpe?g|png|webp|gif|svg|avif)$)|(^(img|dsc|image|photo|whatsapp image|screenshot|ekran görüntüsü)[\s_-]*\d)/i;

	const host = location.hostname.replace(/^www\./, "");
	const list = Array.isArray(window.GK_TARAMA_SAYFALAR) ? window.GK_TARAMA_SAYFALAR : PAGES[host] || [location.pathname + location.search];

	// ---------- renk yardımcıları ----------
	function parseColor(str) {
		if (!str) return null;
		if (str === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
		const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/.exec(str);
		if (!m) return null;
		return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) / (m[5] ? 100 : 1) };
	}
	const over = (top, bottom) => {
		const a = top.a + bottom.a * (1 - top.a);
		if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
		const mix = (k) => Math.round((top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a);
		return { r: mix("r"), g: mix("g"), b: mix("b"), a };
	};
	const lin = (v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	};
	const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
	const ratio = (a, b) => {
		const x = lum(a);
		const y = lum(b);
		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	};
	const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");

	// ---------- genel yardımcılar ----------
	const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
	const short = (s, n = 50) => {
		const t = clean(s);
		return t.length > n ? t.slice(0, n - 1) + "…" : t;
	};
	const lower = (s) => clean(s).toLocaleLowerCase("tr");
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));

	function selectorOf(el) {
		const parts = [];
		for (let n = el, i = 0; n && n.nodeType === 1 && i < 3; n = n.parentElement, i++) {
			let p = n.tagName.toLowerCase();
			if (n.id) {
				parts.unshift(p + "#" + n.id);
				break;
			}
			const cls = typeof n.className === "string" ? n.className.trim().split(/\s+/).filter((c) => c && !c.startsWith("gk-")).slice(0, 2) : [];
			if (cls.length) p += "." + cls.join(".");
			parts.unshift(p);
		}
		return parts.join(" > ");
	}

	// ---------- tek sayfanın taranması ----------
	function scan(doc, win, rendered) {
		const r = { issues: {}, counts: {}, outline: [], info: [] };
		const add = (key, text) => {
			const box = (r.issues[key] = r.issues[key] || { n: 0, ex: [] });
			box.n++;
			if (box.ex.length < MAX_EXAMPLES && text && !box.ex.includes(text)) box.ex.push(text);
		};
		const all = (sel) => [...doc.querySelectorAll(sel)].filter((el) => !el.closest(SKIP_SEL));
		const visible = (el) => {
			if (el.closest("[hidden]")) return false;
			if (!rendered) return !el.closest('[style*="display:none"], [style*="display: none"]');
			if (el.checkVisibility) return el.checkVisibility({ checkVisibilityCSS: true });
			return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
		};
		const exposed = (el) => visible(el) && !el.closest('[aria-hidden="true"]');
		const isField = (el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);

		function textName(node) {
			let out = "";
			for (const ch of node.childNodes) {
				if (ch.nodeType === 3) out += " " + ch.nodeValue;
				else if (ch.nodeType === 1) {
					if (ch.getAttribute("aria-hidden") === "true" || (rendered && !visible(ch))) continue;
					if (ch.tagName === "IMG") out += " " + (ch.getAttribute("alt") || "");
					else if (ch.tagName.toLowerCase() === "svg") {
						const t = ch.querySelector("title");
						out += " " + (ch.getAttribute("aria-label") || (t ? t.textContent : ""));
					} else if (ch.getAttribute("aria-label")) out += " " + ch.getAttribute("aria-label");
					else out += " " + textName(ch);
				}
			}
			return out;
		}

		function nameOf(el) {
			const lb = el.getAttribute("aria-labelledby");
			if (lb) {
				const t = clean(lb.split(/\s+/).map((id) => doc.getElementById(id)).filter(Boolean).map((n) => n.textContent).join(" "));
				if (t) return t;
			}
			const al = clean(el.getAttribute("aria-label"));
			if (al) return al;
			if (el.tagName === "IMG" || (el.tagName === "INPUT" && el.type === "image")) return clean(el.getAttribute("alt"));
			if (isField(el)) {
				const fromLabels = el.labels ? clean([...el.labels].map((l) => l.textContent).join(" ")) : "";
				if (fromLabels) return fromLabels;
				if (el.tagName === "INPUT" && /^(submit|button|reset)$/.test(el.type)) return clean(el.value) || (el.type === "submit" ? "Gönder" : "");
				return clean(el.getAttribute("title"));
			}
			return clean(textName(el)) || clean(el.getAttribute("title"));
		}

		// --- sayfa geneli ---
		const html = doc.documentElement;
		const lang = html.getAttribute("lang") || "";
		if (!lang) add("Sayfa dili (lang) yok", "");
		r.info.push("dil " + (lang || "-"));
		if (!clean(doc.title)) add("Sayfa başlığı (<title>) boş", "");
		const vp = doc.querySelector('meta[name="viewport"]');
		if (vp) {
			const c = (vp.getAttribute("content") || "").toLowerCase();
			const max = /maximum-scale\s*=\s*([\d.]+)/.exec(c);
			if (/user-scalable\s*=\s*(no|0)/.test(c) || (max && parseFloat(max[1]) < 2)) add("Yakınlaştırma engellenmiş (viewport)", c);
		}
		if (!doc.querySelector('main, [role="main"]')) add("Ana bölge (<main>) yok", "");
		const firstLink = all('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])').find((el) => !el.closest(SKIP_SEL));
		const skipLink = firstLink && firstLink.tagName === "A" && /^#./.test(firstLink.getAttribute("href") || "");
		r.info.push(skipLink ? "atlama bağlantısı var" : "atlama bağlantısı yok");

		const ids = new Map();
		for (const el of all("[id]")) ids.set(el.id, (ids.get(el.id) || 0) + 1);
		for (const [id, n] of ids) if (n > 1 && id) add("Tekrarlı kimlik (id)", id + " ×" + n);

		// --- görseller ---
		const imgs = all("img").filter(exposed);
		r.counts.görsel = imgs.length;
		for (const img of imgs) {
			const src = (img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || "").split("/").pop().split("?")[0];
			if (!img.hasAttribute("alt")) {
				add("Alt metni olmayan görsel", src + " (" + selectorOf(img) + ")");
				continue;
			}
			const altRaw = clean(img.getAttribute("alt"));
			const alt = lower(altRaw);
			if (alt && FILE_ALT.test(altRaw)) add("Alt metni dosya adı gibi", '"' + short(altRaw, 40) + '"');
			else if (alt && GENERIC_ALT.test(alt)) add("Alt metni çok genel", '"' + altRaw + '" ' + src);
		}
		for (const el of all('[role="img"]').filter(exposed)) if (!nameOf(el)) add('Adsız role="img"', selectorOf(el));
		for (const el of all('input[type="image"]').filter(exposed)) if (!clean(el.getAttribute("alt"))) add("Alt metni olmayan görsel düğme", selectorOf(el));

		// --- bağlantılar ve düğmeler ---
		const links = all("a[href]").filter(exposed);
		r.counts.bağlantı = links.length;
		const vague = new Map();
		for (const a of links) {
			const name = nameOf(a);
			const href = a.getAttribute("href") || "";
			if (!name) add("Adı olmayan bağlantı (yalnızca simge ya da görsel)", short(href, 60) + " (" + selectorOf(a) + ")");
			else if (VAGUE.test(lower(name))) vague.set(lower(name), (vague.get(lower(name)) || 0) + 1);
		}
		for (const [t, n] of vague) {
			const box = (r.issues["Bağlamı olmayan bağlantı metni"] = r.issues["Bağlamı olmayan bağlantı metni"] || { n: 0, ex: [] });
			box.n += n;
			if (box.ex.length < MAX_EXAMPLES) box.ex.push('"' + t + '" ×' + n);
		}
		const buttons = all('button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]').filter(exposed);
		r.counts.düğme = buttons.length;
		for (const b of buttons) if (!nameOf(b)) add("Adı olmayan düğme", selectorOf(b));
		for (const el of all('[role="button"], [role="link"], [role="tab"], [role="menuitem"]').filter(exposed)) {
			if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) && !el.hasAttribute("tabindex")) add("Klavyeyle erişilemeyen etkileşimli öğe (tabindex yok)", selectorOf(el) + ' role="' + el.getAttribute("role") + '"');
		}
		for (const el of all("[onclick]").filter(exposed)) {
			if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL)$/.test(el.tagName) && !el.hasAttribute("tabindex") && !el.hasAttribute("role")) add("Tıklanabilir ama klavyeyle erişilemeyen öğe (onclick)", selectorOf(el));
		}
		for (const el of all("[tabindex]").filter(visible)) if (parseInt(el.getAttribute("tabindex"), 10) > 0) add("Pozitif tabindex (sekme sırasını bozar)", selectorOf(el) + " tabindex=" + el.getAttribute("tabindex"));
		const focusable = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
		for (const box of all('[aria-hidden="true"]').filter(visible)) {
			const f = [...box.querySelectorAll(focusable)].filter((el) => visible(el) && !el.disabled && el.getAttribute("tabindex") !== "-1");
			const self = box.matches(focusable) && !box.disabled && box.getAttribute("tabindex") !== "-1";
			if (self || f.length) add('aria-hidden="true" içinde odaklanabilir öğe', selectorOf(box));
		}

		// --- formlar ---
		const fields = all("input, select, textarea").filter((el) => exposed(el) && !/^(hidden|submit|button|reset|image)$/.test(el.type));
		r.counts.form_alanı = fields.length;
		for (const f of fields) {
			if (nameOf(f)) continue;
			const ph = clean(f.getAttribute("placeholder"));
			const what = f.tagName.toLowerCase() + (f.type && f.tagName === "INPUT" ? "[type=" + f.type + "]" : "") + (f.name ? " name=" + f.name : "");
			if (ph) add("Etiketsiz form alanı (yalnızca yer tutucu metin var)", what + ' "' + short(ph, 30) + '"');
			else add("Etiketsiz form alanı", what);
		}

		// --- başlıklar ---
		const heads = all('h1, h2, h3, h4, h5, h6, [role="heading"]').filter(exposed);
		let prev = 0;
		let h1 = 0;
		for (const hd of heads) {
			const level = /^H\d$/.test(hd.tagName) ? +hd.tagName[1] : parseInt(hd.getAttribute("aria-level"), 10) || 2;
			const text = nameOf(hd);
			if (level === 1) h1++;
			if (!text) add("Boş başlık", "h" + level + " " + selectorOf(hd));
			if (prev && level > prev + 1) add("Başlık seviyesi atlanmış", "h" + prev + " → h" + level + ' "' + short(text, 40) + '"');
			prev = level;
			if (r.outline.length < 30) r.outline.push("h" + level + " " + short(text, 45));
		}
		if (h1 === 0) add("Sayfada h1 yok", "");
		if (h1 > 1) add("Birden fazla h1", h1 + " adet");

		// --- diğer ---
		for (const f of all("iframe").filter(exposed)) if (!clean(f.getAttribute("title")) && !clean(f.getAttribute("aria-label"))) add("Başlığı (title) olmayan iframe", short((f.getAttribute("src") || f.getAttribute("data-src") || "").split("?")[0], 60));
		for (const v of all("video[autoplay], audio[autoplay]").filter(visible)) if (!v.muted && !v.hasAttribute("muted")) add("Sesli otomatik oynatma", selectorOf(v));
		for (const el of all("[aria-labelledby], [aria-describedby]")) {
			for (const attr of ["aria-labelledby", "aria-describedby"]) {
				const v = el.getAttribute(attr);
				if (v && v.split(/\s+/).some((id) => id && !doc.getElementById(id))) add("ARIA başvurusu bulunamayan kimliğe gidiyor", attr + '="' + v + '"');
			}
		}

		// --- renk kontrastı (yaklaşık) ---
		if (!rendered) {
			r.info.push("kontrast ölçülemedi (sayfa çerçevede açılamadı)");
			return r;
		}
		const MEDIA = /^(IMG|PICTURE|VIDEO|CANVAS|IFRAME|EMBED|OBJECT)$/;
		// Slayt alanları (yazılar görselin üstünde). Genel "slider" sınıf eşleşmesi kullanılmaz; bazı temalar
		// <body>'ye bu adla sınıf ekliyor ve bütün sayfa ölçüm dışı kalıyordu.
		const slider = "sr7-module, rs-module-wrap, rs-module, .swiper, .swiper-container, .slick-slider, .owl-carousel, .flexslider, .elementor-background-slideshow, .mfn-main-slider";
		const pairs = new Map();
		const verify = [];
		let unsure = 0;
		const record = (fgRaw, bg, size, bold, text) => {
			const fg = over(fgRaw, bg);
			const large = size >= 24 || (size >= 18.66 && bold);
			const k = ratio(fg, bg);
			if (k >= (large ? 3 : 4.5)) return;
			const key = hex(fg) + " / " + hex(bg);
			const p = pairs.get(key) || { k, n: 0, ex: short(text, 35), large };
			p.n++;
			pairs.set(key, p);
		};
		const composite = (layers) => {
			let bg = { r: 255, g: 255, b: 255, a: 1 };
			for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
			return bg;
		};
		for (const el of all("body *")) {
			if (/^(SCRIPT|STYLE|OPTION|svg)$/i.test(el.tagName) || el.closest("svg, button:disabled, fieldset:disabled")) continue;
			let direct = "";
			for (const ch of el.childNodes) if (ch.nodeType === 3) direct += ch.nodeValue;
			direct = clean(direct).replace(/[\uE000-\uF8FF]/g, "");
			if (!direct || !exposed(el)) continue;
			const box = el.getBoundingClientRect();
			if (box.width < 2 || box.height < 2) continue;
			const cs = win.getComputedStyle(el);
			if (parseFloat(cs.opacity) === 0 || el.closest(slider)) continue;
			const fgRaw = parseColor(cs.color);
			if (!fgRaw) continue;
			const size = parseFloat(cs.fontSize);
			const bold = parseInt(cs.fontWeight, 10) >= 700;
			const layers = [];
			let state = "ok";
			for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
				const ns = n === el ? cs : win.getComputedStyle(n);
				if (ns.backgroundImage && ns.backgroundImage !== "none") {
					state = "image";
					break;
				}
				const c = parseColor(ns.backgroundColor);
				if (c && c.a > 0) {
					layers.push(c);
					if (c.a >= 0.99) break;
				}
				// Zemini olmayan, konumlandırılmış bir katman (ör. kart görselinin üstündeki yazı) başka bir
				// öğenin üstünde durur; arkasındaki renk ekrandaki konumundan doğrulanır.
				if (ns.position === "absolute" || ns.position === "fixed") {
					state = "check";
					break;
				}
			}
			if (state === "image") {
				unsure++;
				continue;
			}
			const bg = composite(layers);
			const fg = over(fgRaw, bg);
			const large = size >= 24 || (size >= 18.66 && bold);
			if (state === "check" || ratio(fg, bg) < (large ? 3 : 4.5)) verify.push({ el, fgRaw, size, bold, text: direct });
			else record(fgRaw, bg, size, bold, direct);
		}
		// Şüpheli yazılar ekrandaki konumlarından doğrulanır: yazının altında görsel varsa ölçülmez,
		// yoksa gerçekten altında duran zeminle hesaplanır (DOM'da kardeş olan arka planlar dahil).
		for (const v of verify.slice(0, 150)) {
			const rect0 = v.el.getBoundingClientRect();
			win.scrollTo(0, Math.max(0, rect0.top + win.scrollY - 300));
			const rect = v.el.getBoundingClientRect();
			const x = Math.min(win.innerWidth - 2, Math.max(1, rect.left + Math.min(rect.width / 2, 40)));
			const y = Math.min(win.innerHeight - 2, Math.max(1, rect.top + rect.height / 2));
			const stack = doc.elementsFromPoint(x, y);
			const at = stack.findIndex((n) => n === v.el || v.el.contains(n));
			if (at < 0) {
				unsure++;
				continue;
			}
			const layers = [];
			let image = false;
			for (const n of stack.slice(at + 1)) {
				if (v.el.contains(n)) continue;
				if (MEDIA.test(n.tagName)) {
					image = true;
					break;
				}
				const ns = win.getComputedStyle(n);
				if (ns.backgroundImage && ns.backgroundImage !== "none") {
					image = true;
					break;
				}
				const c = parseColor(ns.backgroundColor);
				if (c && c.a > 0) {
					layers.push(c);
					if (c.a >= 0.99) break;
				}
			}
			if (image) {
				unsure++;
				continue;
			}
			const own = parseColor(win.getComputedStyle(v.el).backgroundColor);
			if (own && own.a > 0) layers.unshift(own);
			record(v.fgRaw, composite(layers), v.size, v.bold, v.text);
		}
		if (verify.length > 150) r.info.push((verify.length - 150) + " şüpheli yazı doğrulanmadı");
		win.scrollTo(0, 0);
		r.contrast = [...pairs.entries()].sort((a, b) => b[1].n - a[1].n);
		if (unsure) r.info.push(unsure + " yazı görsel üstünde (kontrast ölçülmedi)");
		return r;
	}

	// ---------- sayfayı çerçevede açma ----------
	function openInFrame(path) {
		return new Promise((resolve) => {
			const frame = document.createElement("iframe");
			const st = frame.style;
			st.position = "fixed";
			st.left = "0";
			st.top = "0";
			st.width = "1366px";
			st.height = "900px";
			st.opacity = "0";
			st.pointerEvents = "none";
			st.zIndex = "-1";
			frame.setAttribute("aria-hidden", "true");
			frame.setAttribute("tabindex", "-1");
			let done = false;
			const finish = (value) => {
				if (done) return;
				done = true;
				resolve(value);
			};
			frame.addEventListener("load", async () => {
				try {
					const doc = frame.contentDocument;
					const win = frame.contentWindow;
					if (!doc || !doc.body || /^chrome-error|^about:/.test(win.location.href)) throw new Error("çerçeve açılmadı");
					await wait(SETTLE_MS);
					// Gecikmeli yüklenen içerik için sayfa aşağı kaydırılıp geri alınır.
					const h = doc.documentElement.scrollHeight;
					for (let y = 0; y < h; y += 900) {
						win.scrollTo(0, y);
						await wait(150);
					}
					win.scrollTo(0, 0);
					await wait(400);
					finish({ frame, doc, win });
				} catch (e) {
					finish({ frame, error: e });
				}
			});
			setTimeout(() => finish({ frame, error: new Error("zaman aşımı") }), 30000);
			frame.src = path;
			document.body.append(frame);
		});
	}

	async function scanHtmlOnly(path) {
		const res = await fetch(path, { credentials: "same-origin" });
		const text = await res.text();
		const doc = new DOMParser().parseFromString(text, "text/html");
		return scan(doc, window, false);
	}

	// ---------- rapor ----------
	function format(path, title, r) {
		const out = ["", "=== " + path + (title ? "  (" + short(title, 60) + ")" : "") + " ==="];
		out.push("Özet: " + Object.entries(r.counts).map(([k, v]) => v + " " + k.replace("_", " ")).join(", ") + " | " + r.info.join(" | "));
		const keys = Object.keys(r.issues);
		if (!keys.length && !(r.contrast && r.contrast.length)) out.push("Sorun bulunmadı.");
		for (const k of keys) {
			const it = r.issues[k];
			out.push("- " + k + ": " + it.n + (it.ex.length ? "  ör: " + it.ex.join("; ") : ""));
		}
		if (r.contrast && r.contrast.length) {
			const total = r.contrast.reduce((s, [, p]) => s + p.n, 0);
			out.push("- Yetersiz renk kontrastı: " + total + " yazı, " + r.contrast.length + " renk çifti");
			for (const [key, p] of r.contrast.slice(0, 6)) out.push("    " + key + "  " + p.k.toFixed(2) + ":1 (gereken " + (p.large ? "3" : "4.5") + ")  " + p.n + " yazı, ör: \"" + p.ex + "\"");
		}
		if (r.outline.length) out.push("Başlık ana hattı: " + r.outline.join(" › "));
		return out.join("\n");
	}

	function showPanel(text) {
		const old = document.getElementById("gk-tarama-panel");
		if (old) old.remove();
		const panel = document.createElement("div");
		panel.id = "gk-tarama-panel";
		Object.assign(panel.style, { position: "fixed", right: "16px", bottom: "16px", width: "min(720px, calc(100vw - 32px))", zIndex: "2147483647", background: "#ffffff", color: "#18212b", border: "2px solid #085e9d", borderRadius: "10px", padding: "12px", boxShadow: "0 8px 30px rgba(0,0,0,.3)", font: "14px/1.4 system-ui, sans-serif" });
		const title = document.createElement("strong");
		title.textContent = "GözKulak erişilebilirlik taraması";
		const area = document.createElement("textarea");
		area.value = text;
		area.readOnly = true;
		Object.assign(area.style, { display: "block", width: "100%", height: "320px", margin: "8px 0", font: "12px/1.4 ui-monospace, monospace", color: "#18212b", background: "#f6f8fa" });
		const copyBtn = document.createElement("button");
		copyBtn.type = "button";
		copyBtn.textContent = "Kopyala";
		const closeBtn = document.createElement("button");
		closeBtn.type = "button";
		closeBtn.textContent = "Kapat";
		for (const b of [copyBtn, closeBtn]) Object.assign(b.style, { marginRight: "8px", padding: "6px 14px", font: "inherit", cursor: "pointer" });
		copyBtn.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(text);
			} catch (e) {
				area.select();
				document.execCommand("copy");
			}
			copyBtn.textContent = "Kopyalandı";
		});
		closeBtn.addEventListener("click", () => panel.remove());
		panel.append(title, area, copyBtn, closeBtn);
		document.body.append(panel);
	}

	// ---------- çalıştırma ----------
	const PREF_KEY = "gozkulak:v1";
	let savedPrefs = null;
	try {
		savedPrefs = localStorage.getItem(PREF_KEY);
		if (savedPrefs) localStorage.removeItem(PREF_KEY);
	} catch (e) {
		// Depolama kapalı: tercih yok sayılır.
	}

	const started = Date.now();
	const report = ["GözKulak erişilebilirlik taraması | " + location.hostname + " | " + new Date().toLocaleString("tr-TR") + " | " + navigator.userAgent.replace(/^.*\) /, "")];
	const totals = {};
	try {
		for (const [i, path] of list.entries()) {
			console.log("GözKulak tarama: " + (i + 1) + "/" + list.length + " " + path);
			let r;
			let title = "";
			const opened = await openInFrame(path);
			if (opened.error) {
				try {
					r = await scanHtmlOnly(path);
					r.info.push("yalnızca HTML denetlendi (" + opened.error.message + ")");
				} catch (e) {
					report.push("", "=== " + path + " ===", "Açılamadı: " + e.message);
					opened.frame.remove();
					continue;
				}
			} else {
				title = opened.doc.title;
				r = scan(opened.doc, opened.win, true);
			}
			opened.frame.remove();
			for (const [k, it] of Object.entries(r.issues)) totals[k] = (totals[k] || 0) + it.n;
			if (r.contrast && r.contrast.length) totals["Yetersiz renk kontrastı"] = (totals["Yetersiz renk kontrastı"] || 0) + r.contrast.reduce((s, [, p]) => s + p.n, 0);
			report.push(format(path, title, r));
		}
	} finally {
		try {
			if (savedPrefs) localStorage.setItem(PREF_KEY, savedPrefs);
		} catch (e) {
			// yok sayılır
		}
	}
	const sum = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, n]) => "  " + k + ": " + n);
	report.splice(1, 0, "Toplam (" + list.length + " sayfa, " + Math.round((Date.now() - started) / 1000) + " sn):", ...(sum.length ? sum : ["  Sorun bulunmadı."]));
	const text = report.join("\n");
	console.log(text);
	showPanel(text);
})();

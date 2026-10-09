/*!
 * GözKulak — erişilebilirlik menüsü.
 * Menü Shadow DOM içinde çizilir; tema stilleri menüyü, menü stilleri temayı etkilemez.
 * Sayfaya HTML dizesi yazılmaz (innerHTML yok); tüm öğeler DOM işlemleriyle kurulur.
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

	const lang = /^en\b/i.test(document.documentElement.lang || "") ? "en" : "tr";
	const STR = {
		tr: {
			open: "Erişilebilirlik menüsünü aç",
			title: "Erişilebilirlik",
			close: "Menüyü kapat",
			soon: "Menü özellikleri bir sonraki adımda eklenecek.",
			test: "Test modu: menüyü yalnızca yöneticiler görüyor.",
		},
		en: {
			open: "Open accessibility menu",
			title: "Accessibility",
			close: "Close menu",
			soon: "Menu features will be added in the next step.",
			test: "Test mode: only administrators can see this menu.",
		},
	}[lang];

	const SVG_NS = "http://www.w3.org/2000/svg";

	/** HTML öğesi kurar. "text" anahtarı textContent'e yazılır. */
	function h(tag, attrs, ...children) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(attrs || {})) {
			if (key === "text") node.textContent = value;
			else if (value === true) node.setAttribute(key, "");
			else if (value !== false && value != null) node.setAttribute(key, String(value));
		}
		for (const child of children) if (child) node.append(child);
		return node;
	}

	function s(tag, attrs) {
		const node = document.createElementNS(SVG_NS, tag);
		for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
		return node;
	}

	function icon(name) {
		const svg = s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", class: "gk-icon" });
		const line = { fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round" };
		if (name === "eye") {
			svg.append(
				s("path", Object.assign({ d: "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" }, line)),
				s("circle", { cx: 12, cy: 12, r: 3, fill: "currentColor" })
			);
		} else if (name === "text") {
			const t = s("text", { x: 12, y: 16.5, "text-anchor": "middle", "font-size": 12, "font-weight": 700, "font-family": "system-ui, sans-serif", fill: "currentColor" });
			t.textContent = "Aa";
			svg.append(t);
		} else {
			svg.append(
				s("circle", { cx: 12, cy: 12, r: 10.25, fill: "none", stroke: "currentColor", "stroke-width": "1.5" }),
				s("circle", { cx: 12, cy: 6.7, r: 1.7, fill: "currentColor" }),
				s("path", Object.assign({ d: "M6.6 9.4l5.4 1.1 5.4-1.1M12 10.5v3.5M12 14l-2.6 4.6M12 14l2.6 4.6" }, line))
			);
		}
		return svg;
	}

	function closeIcon() {
		const svg = s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", class: "gk-icon" });
		svg.append(s("path", { d: "M6 6l12 12M18 6L6 18", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }));
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

	// ---------- kök öğe: kritik konum stilleri satır içi (tema seçicileri ezemesin) ----------
	const position = ["bottom-right", "bottom-left", "middle-right", "middle-left"].includes(cfg.position) ? cfg.position : "bottom-right";
	const offset = Array.isArray(cfg.offset) ? cfg.offset : [20, 20];
	const x = Math.max(0, Math.min(200, Number(offset[0]) || 0)) + "px";
	const y = Math.max(0, Math.min(200, Number(offset[1]) || 0)) + "px";
	const size = Math.max(44, Math.min(80, Number(cfg.size) || 56));
	const color = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(cfg.color || "") ? cfg.color : "#085e9d";

	const host = document.createElement("gozkulak-root");
	host.setAttribute("data-position", position);
	const hs = host.style;
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
		hs.setProperty("bottom", y);
	} else {
		hs.setProperty("top", "50%");
		hs.setProperty("transform", "translateY(-50%)");
	}

	const root = host.attachShadow({ mode: "open" });

	const sheet = h("link", { rel: "stylesheet", href: cfg.css });
	sheet.addEventListener("load", () => hs.removeProperty("display"));
	sheet.addEventListener("error", () => {
		// Stil yüklenemezse biçimsiz bir düğme göstermektense menüyü gizli tutar.
		if (window.console) console.warn("GözKulak: menü stili yüklenemedi.");
	});

	// ---------- düğme ve panel ----------
	const button = h("button", {
		type: "button",
		class: "gk-btn",
		"aria-label": STR.open,
		"aria-expanded": "false",
		"aria-controls": "gk-panel",
	}, icon(cfg.icon));

	const title = h("h2", { id: "gk-title", class: "gk-title", tabindex: "-1", text: STR.title });
	const closeButton = h("button", { type: "button", class: "gk-close", "aria-label": STR.close }, closeIcon());
	const body = h("div", { class: "gk-body" }, h("p", { text: STR.soon }));
	if (cfg.testMode) body.append(h("p", { class: "gk-test", text: STR.test }));
	const panel = h("div", {
		id: "gk-panel",
		class: "gk-panel",
		role: "dialog",
		"aria-labelledby": "gk-title",
		hidden: true,
	}, h("div", { class: "gk-head" }, title, closeButton), body);

	function isOpen() {
		return !panel.hidden;
	}

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
	// Panelin dışına tıklanınca kapanır.
	document.addEventListener("pointerdown", (e) => {
		if (isOpen() && !e.composedPath().includes(host)) close(false);
	});

	root.append(sheet, panel, button);

	const mount = () => {
		document.body.append(host);
		window.GozKulak = { version: cfg.version, open, close: () => close(false) };
	};
	if (document.body) mount();
	else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();

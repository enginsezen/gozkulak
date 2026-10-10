/*
 * GözKulak tanı betiği: slider'ın yüksek kontrastta neden görünmediğini bulmak için.
 * Kullanım: siteyi yönetici olarak açın, yüksek kontrastı açın, birkaç saniye bekleyin,
 * tarayıcı konsoluna (F12 → Console) bu betiği yapıştırıp Enter'a basın.
 * Çıktı konsola yazılır ve panoya kopyalanır. Sayfayı değiştirmez, hiçbir yere veri göndermez.
 */
(() => {
	const root = document.querySelector("rs-module-wrap, sr7-module, .rev_slider_wrapper, rs-module");
	if (!root) return console.log("Slider bulunamadı.");
	const row = (el) => {
		const cs = getComputedStyle(el);
		const r = el.getBoundingClientRect();
		const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 5).join(".") : "";
		const img = cs.backgroundImage === "none" ? "-" : cs.backgroundImage.slice(0, 50);
		return [el.tagName.toLowerCase() + (cls ? "." + cls : ""), Math.round(r.width) + "x" + Math.round(r.height), "zemin " + cs.backgroundColor, "görsel " + img, "opaklık " + cs.opacity, cs.visibility, "z " + cs.zIndex].join(" | ");
	};
	const box = root.getBoundingClientRect();
	const lines = ["GözKulak " + ((window.GozKulak && window.GozKulak.version) || "?") + " | html: " + document.documentElement.className, "slider: " + row(root), "— slider ortasındaki öğeler:"];
	for (const el of document.elementsFromPoint(box.left + box.width / 2, box.top + Math.min(box.height / 2, innerHeight / 2)).slice(0, 12)) lines.push(row(el));
	lines.push("— slider içindeki öğeler:");
	[...root.querySelectorAll("*")].slice(0, 45).forEach((el) => lines.push(row(el)));
	const out = lines.join("\n");
	console.log(out);
	try {
		copy(out);
		console.log("Çıktı panoya kopyalandı.");
	} catch (e) {
		// copy() yalnızca geliştirici konsolunda vardır.
	}
})();

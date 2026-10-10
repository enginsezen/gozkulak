(() => {
	window.__spoken = [];
	class FakeUtterance {
		constructor(text) { this.text = text; this.rate = 1; this.lang = ""; this.voice = null; }
	}
	const synth = {
		speaking: false,
		pending: false,
		_cur: null,
		_t: 0,
		getVoices() {
			return [{ name: "Türkçe Türkiye", lang: "tr-TR", localService: true, default: true }, { name: "English US", lang: "en-US", localService: true, default: false }];
		},
		speak(u) {
			this.speaking = true;
			this._cur = u;
			window.__spoken.push({ text: u.text, rate: u.rate, lang: u.lang, voice: u.voice && u.voice.name });
			setTimeout(() => u.onstart && u.onstart(), 5);
			this._t = setTimeout(() => { this.speaking = false; this._cur = null; u.onend && u.onend(); }, window.__speakMs || 250);
		},
		cancel() {
			clearTimeout(this._t);
			const u = this._cur;
			this._cur = null;
			this.speaking = false;
			if (u && u.onerror) setTimeout(() => u.onerror({ error: "interrupted" }), 0);
		},
		pause() {}, resume() {},
		addEventListener() {}, removeEventListener() {},
	};
	Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
	window.SpeechSynthesisUtterance = FakeUtterance;
})();

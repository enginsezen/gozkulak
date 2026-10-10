#!/bin/sh
# GözKulak — doğal ses dosyalarını kendi sunucunuza indirir ve SHA-256 ile doğrular.
#
# Kullanım: sitenin kök klasöründe, sitenin kullanıcısıyla çalıştırın:
#   cd ~/htdocs/<alan-adı> && sh tts-dosyalari.sh
#
# Sunucuya hiçbir paket kurmaz; yalnızca sistemde zaten bulunan curl, sha256sum ve gzip kullanılır.
# Dosyalar sürüme sabitlidir: model ozcancelik/ema-lightning-onnx@13c431d, ONNX Runtime Web 1.30.0.
# Tekrar çalıştırmak güvenlidir: inmiş dosyalar yeniden indirilmez, yalnızca doğrulanır.
set -eu

EMA=ema-lightning-onnx/13c431d
ORT=onnxruntime-web/1.30.0
HF=https://huggingface.co/ozcancelik/ema-lightning-onnx/resolve/13c431db0356b2f7fafb1247cd823ec0d777c820
JD=https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist

mkdir -p "$EMA" "$ORT"

get() {
	if [ -s "$2" ]; then
		return 0
	fi
	echo "İndiriliyor: $2"
	curl -fL --retry 3 --retry-delay 2 -o "$2.part" "$1"
	mv "$2.part" "$2"
}

for f in meta.json normalizer.wasm text.onnx sound.onnx decoder.onnx; do
	get "$HF/$f" "$EMA/$f"
done
for f in ort.wasm.min.mjs ort-wasm-simd-threaded.mjs ort-wasm-simd-threaded.wasm ort.webgpu.min.mjs ort-wasm-simd-threaded.asyncify.mjs ort-wasm-simd-threaded.asyncify.wasm; do
	get "$JD/$f" "$ORT/$f"
done

echo "Doğrulanıyor (SHA-256)…"
SUMS=$(mktemp)
trap 'rm -f "$SUMS"' EXIT
cat >"$SUMS" <<'LIST'
76627201405723633f5319a208ed7dea63c42acbf3ca997671bccdca9d9186b2  ema-lightning-onnx/13c431d/meta.json
2614bcf15b4546249d49474c029420a4a611daf9e9a0c596cc852bd16cdecc89  ema-lightning-onnx/13c431d/normalizer.wasm
ad5d4885b5d218f63d976a6e562334ea0194aec54847a6c6482d328e784089f0  ema-lightning-onnx/13c431d/text.onnx
958364217360cecaa92dc5ff2170d19f3c9f6995fd5e61241ea4068971a46a59  ema-lightning-onnx/13c431d/sound.onnx
396c06a8e5711fd40bfd2c3f4f33851feb2ad07a86485833844e0ae8ff637b17  ema-lightning-onnx/13c431d/decoder.onnx
219e6a1fc8a9938268d18efca3c91d310bd2f4a59bbd13744df5b2b7fc6cee3b  onnxruntime-web/1.30.0/ort.wasm.min.mjs
e13f7f94fc51b4ca72b12faeb1ee95f4ace6dfbc8939bc718aabdc0a27c4299b  onnxruntime-web/1.30.0/ort-wasm-simd-threaded.mjs
3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2  onnxruntime-web/1.30.0/ort-wasm-simd-threaded.wasm
3dffff71811bc13a3a3d9591c57ca5ee5735b8f5f3eaf789510b02bb040ae3a0  onnxruntime-web/1.30.0/ort.webgpu.min.mjs
3d1c85995364bb643302fc6fd877a0c3ba5ae72401815e0f24828a53d9191e28  onnxruntime-web/1.30.0/ort-wasm-simd-threaded.asyncify.mjs
39f9f0894d478800487ed9f7dbe92618498db320cf55c8e3d89adff8dce658da  onnxruntime-web/1.30.0/ort-wasm-simd-threaded.asyncify.wasm
LIST
if ! sha256sum -c "$SUMS"; then
	# Doğrulaması tutmayan dosyalar silinir; betik yeniden çalıştırılınca yeniden indirilir.
	sha256sum -c "$SUMS" 2>/dev/null | sed -n 's/: FAILED.*$//p' | while read -r bad; do
		rm -f "$bad" "$bad.gz"
		echo "Silindi: $bad" >&2
	done
	echo "HATA: doğrulaması tutmayan dosyalar silindi. Betiği yeniden çalıştırın; sorun sürerse kaynak değişmiş olabilir." >&2
	exit 1
fi

# Ön sıkıştırma (nginx gzip_static): yalnızca en az %10 küçülen dosyaların .gz kopyası bırakılır.
echo "Sıkıştırılmış kopyalar hazırlanıyor…"
for p in "$EMA"/* "$ORT"/*; do
	case "$p" in
	*.gz | *.part) continue ;;
	esac
	gzip -9 -k -f "$p"
	o=$(wc -c <"$p")
	g=$(wc -c <"$p.gz")
	if [ $((g * 10)) -gt $((o * 9)) ]; then
		rm -f "$p.gz"
	else
		echo "  $p: $o → $g bayt"
	fi
done

echo "Tamam. Klasörler:"
du -sh "$EMA" "$ORT"

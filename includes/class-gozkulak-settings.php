<?php
/**
 * Ayarların tanımı, varsayılanları ve temizlenmesi.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Tek bir seçenekte (gozkulak_settings) tutulan site ayarları.
 *
 * @phpstan-type Settings array{enabled: bool, visibility: string, position: string, offset_x: int, offset_y: int, size: int, icon: string, color: string, features: array<string, bool>, content_selector: string, tts_base: string, tts_fallback: bool, prepared_audio: bool, pronunciations: string}
 */
final class GozKulak_Settings {

	const OPTION = 'gozkulak_settings';

	const POSITIONS = array( 'bottom-right', 'bottom-left', 'middle-right', 'middle-left' );

	const ICONS = array( 'person', 'eye', 'text' );

	const VISIBILITY = array( 'admins', 'everyone' );

	const SELECTOR_MAX = 500;

	const TTS_BASE_MAX = 200;

	const SAY_LINES = 200;

	const SAY_WORD_MAX = 60;

	const SAY_TEXT_MAX = 100;

	/**
	 * Menüdeki özellikler: anahtar => grup. Etiketler yönetici sayfasında verilir.
	 *
	 * @return array<string, string>
	 */
	public static function features() {
		return array(
			'font_size'       => 'vision',
			'line_height'     => 'vision',
			'letter_spacing'  => 'vision',
			'contrast'        => 'vision',
			'dark_mode'       => 'vision',
			'grayscale'       => 'vision',
			'readable_font'   => 'vision',
			'highlight_links' => 'vision',
			'big_cursor'      => 'vision',
			'reading_mask'    => 'reading',
			'reading_guide'   => 'reading',
			'stop_animations' => 'reading',
			'hide_images'     => 'reading',
			'text_to_speech'  => 'speech',
		);
	}

	/**
	 * Varsayılan ayarlar.
	 *
	 * @return Settings
	 */
	public static function defaults() {
		return array(
			'enabled'          => true,
			'visibility'       => 'admins',
			'position'         => 'bottom-right',
			'offset_x'         => 20,
			'offset_y'         => 20,
			'size'             => 56,
			'icon'             => 'person',
			'color'            => '#085e9d',
			'features'         => array_fill_keys( array_keys( self::features() ), true ),
			'content_selector' => '',
			'tts_base'         => '',
			'tts_fallback'     => true,
			'prepared_audio'   => true,
			'pronunciations'   => '',
		);
	}

	/**
	 * Kayıtlı ayarları varsayılanlarla birleştirip türlerini garanti ederek döndürür.
	 *
	 * @return Settings
	 */
	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return self::normalize( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	/**
	 * Ayar formundan gelen veriyi temizler (register_setting sanitize_callback).
	 *
	 * Geçersiz değerler yok sayılır ve yerine önceki değer korunur.
	 *
	 * @param mixed $input Formdan gelen ham değer (options.php tarafından wp_unslash uygulanmış).
	 * @return Settings
	 */
	public static function sanitize( $input ) {
		$previous = self::get();
		if ( ! is_array( $input ) ) {
			return $previous;
		}

		$clean = self::normalize( $input, $previous, true );

		// normalize() geçersiz seçicide önceki değeri korur; burada yalnızca kullanıcıya bildirilir.
		if ( isset( $input['content_selector'] ) && ( ! is_string( $input['content_selector'] ) || null === self::sanitize_selector( $input['content_selector'] ) ) ) {
			self::error(
				'gozkulak_selector',
				__( 'Okunacak alan seçicisi kaydedilmedi: yalnızca CSS seçicilerinde kullanılan karakterlere izin verilir ve en fazla 500 karakter olabilir.', 'gozkulak' )
			);
		}
		if ( isset( $input['pronunciations'] ) ) {
			$bad = is_string( $input['pronunciations'] ) ? self::bad_pronunciation_line( $input['pronunciations'] ) : 1;
			if ( $bad ) {
				self::error(
					'gozkulak_pronunciations',
					sprintf(
						/* translators: 1: satır numarası, 2: en çok satır, 3: kelime uzunluğu, 4: okunuş uzunluğu */
						__( 'Okunuş sözlüğü kaydedilmedi: %1$d. satır geçersiz. Her satır "kelime = okunuş" biçiminde olmalı; en çok %2$d satır, kelime en çok %3$d, okunuş en çok %4$d karakter. Kelimede harf, rakam, boşluk ve . - \' & + işaretleri kullanılabilir.', 'gozkulak' ),
						$bad,
						self::SAY_LINES,
						self::SAY_WORD_MAX,
						self::SAY_TEXT_MAX
					)
				);
			}
		}
		if ( isset( $input['tts_base'] ) && ( ! is_string( $input['tts_base'] ) || null === self::sanitize_tts_base( $input['tts_base'] ) ) ) {
			self::error(
				'gozkulak_tts_base',
				__( 'Ses dosyalarının adresi kaydedilmedi: https:// ile başlayan, soru işareti ya da # içermeyen bir adres olmalı (ör. https://ses.example.com/).', 'gozkulak' )
			);
		}

		return $clean;
	}

	/**
	 * Değerleri izin verilen türlere ve aralıklara indirger.
	 *
	 * @param array<mixed> $input     Ham değerler.
	 * @param array        $fallback  Geçersiz değerlerin yerine kullanılacak değerler.
	 * @param bool         $from_form Form gönderimi mi (işaretlenmemiş kutular gönderilmez).
	 * @return Settings
	 *
	 * @phpstan-param Settings $fallback
	 */
	private static function normalize( array $input, array $fallback, $from_form = false ) {
		$out = array();

		if ( $from_form ) {
			$out['enabled'] = ! empty( $input['enabled'] );
		} else {
			$out['enabled'] = isset( $input['enabled'] ) ? (bool) $input['enabled'] : $fallback['enabled'];
		}

		$visibility        = self::text( $input, 'visibility' );
		$out['visibility'] = in_array( $visibility, self::VISIBILITY, true ) ? $visibility : $fallback['visibility'];

		$position        = self::text( $input, 'position' );
		$out['position'] = in_array( $position, self::POSITIONS, true ) ? $position : $fallback['position'];

		$out['offset_x'] = self::int_in_range( $input, 'offset_x', 0, 200, $fallback['offset_x'] );
		$out['offset_y'] = self::int_in_range( $input, 'offset_y', 0, 200, $fallback['offset_y'] );
		$out['size']     = self::int_in_range( $input, 'size', 44, 80, $fallback['size'] );

		$icon        = self::text( $input, 'icon' );
		$out['icon'] = in_array( $icon, self::ICONS, true ) ? $icon : $fallback['icon'];

		$color        = sanitize_hex_color( self::text( $input, 'color' ) );
		$out['color'] = $color ? $color : $fallback['color'];

		$features        = isset( $input['features'] ) && is_array( $input['features'] ) ? $input['features'] : array();
		$out['features'] = array();
		foreach ( array_keys( self::features() ) as $key ) {
			if ( $from_form || array_key_exists( $key, $features ) ) {
				$out['features'][ $key ] = ! empty( $features[ $key ] );
			} else {
				$out['features'][ $key ] = ! empty( $fallback['features'][ $key ] );
			}
		}

		$selector                = isset( $input['content_selector'] ) && is_string( $input['content_selector'] ) ? self::sanitize_selector( $input['content_selector'] ) : null;
		$out['content_selector'] = null === $selector ? $fallback['content_selector'] : $selector;

		$base            = isset( $input['tts_base'] ) && is_string( $input['tts_base'] ) ? self::sanitize_tts_base( $input['tts_base'] ) : null;
		$out['tts_base'] = null === $base ? $fallback['tts_base'] : $base;

		if ( $from_form ) {
			$out['tts_fallback'] = ! empty( $input['tts_fallback'] );
		} else {
			$out['tts_fallback'] = isset( $input['tts_fallback'] ) ? (bool) $input['tts_fallback'] : $fallback['tts_fallback'];
		}

		if ( $from_form ) {
			$out['prepared_audio'] = ! empty( $input['prepared_audio'] );
		} else {
			$out['prepared_audio'] = isset( $input['prepared_audio'] ) ? (bool) $input['prepared_audio'] : $fallback['prepared_audio'];
		}

		$say                   = isset( $input['pronunciations'] ) && is_string( $input['pronunciations'] ) ? self::sanitize_pronunciations( $input['pronunciations'] ) : null;
		$out['pronunciations'] = null === $say ? $fallback['pronunciations'] : $say;

		return $out;
	}

	/**
	 * Ses dosyalarının (model ve ONNX Runtime) bulunduğu sunucu adresini temizler. Geçersizse null döner.
	 *
	 * Yalnızca https adresi kabul edilir; sorgu, # ve kullanıcı bilgisi içeremez. Sonuna / eklenir.
	 * Dosyalar tarayıcıda SHA-256 ile doğrulandığı için adres yalnızca nereden indirileceğini belirler.
	 *
	 * @param string $raw Ham adres.
	 * @return string|null
	 */
	public static function sanitize_tts_base( $raw ) {
		$value = trim( $raw );
		if ( '' === $value ) {
			return '';
		}
		if ( strlen( $value ) > self::TTS_BASE_MAX ) {
			return null;
		}
		$url = esc_url_raw( $value, array( 'https' ) );
		// Temizlik adresi değiştirdiyse sessizce kaydedilmez, reddedilir.
		if ( '' === $url || $url !== $value ) {
			return null;
		}
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || empty( $parts['host'] ) || ! isset( $parts['scheme'] ) || 'https' !== strtolower( $parts['scheme'] ) ) {
			return null;
		}
		if ( isset( $parts['query'] ) || isset( $parts['fragment'] ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return null;
		}
		if ( ! preg_match( '#^https://[A-Za-z0-9.\-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~\-/]*)?$#', $url ) ) {
			return null;
		}
		return '/' === substr( $url, -1 ) ? $url : $url . '/';
	}

	/**
	 * Okunuş sözlüğünü temizler: her satır "kelime = okunuş". Boş satırlar ve # ile başlayan açıklamalar
	 * korunur. Geçersiz bir satır varsa null döner (alan kaydedilmez).
	 *
	 * Sözlük yalnızca ziyaretçinin tarayıcısında okunacak metne uygulanır; HTML'e yazılmaz.
	 *
	 * @param string $raw Ham metin.
	 * @return string|null
	 */
	public static function sanitize_pronunciations( $raw ) {
		if ( self::bad_pronunciation_line( $raw ) ) {
			return null;
		}
		$out = array();
		foreach ( self::lines( $raw ) as $line ) {
			$line = trim( $line );
			if ( '' === $line || '#' === $line[0] ) {
				$out[] = $line;
				continue;
			}
			$pair  = self::pronunciation_pair( $line );
			$out[] = null === $pair ? $line : $pair[0] . ' = ' . $pair[1];
		}
		return trim( implode( "\n", $out ) );
	}

	/**
	 * Metni satırlara ayırır.
	 *
	 * @param string $text Metin.
	 * @return string[]
	 */
	private static function lines( $text ) {
		$lines = preg_split( '/\r\n|\r|\n/', $text );
		return is_array( $lines ) ? $lines : array();
	}

	/**
	 * Sözlükteki ilk geçersiz satırın numarası; hepsi geçerliyse 0.
	 *
	 * @param string $raw Ham metin.
	 * @return int
	 */
	private static function bad_pronunciation_line( $raw ) {
		$lines = self::lines( $raw );
		$count = 0;
		foreach ( $lines as $i => $line ) {
			$line = trim( $line );
			if ( '' === $line || '#' === $line[0] ) {
				continue;
			}
			++$count;
			if ( $count > self::SAY_LINES || null === self::pronunciation_pair( $line ) ) {
				return $i + 1;
			}
		}
		return 0;
	}

	/**
	 * Bir sözlük satırını ayırır: array( kelime, okunuş ); geçersizse null.
	 *
	 * @param string $line Satır (boş ya da açıklama değil).
	 * @return array{0: string, 1: string}|null
	 */
	private static function pronunciation_pair( $line ) {
		$at = strpos( $line, '=' );
		if ( false === $at ) {
			return null;
		}
		$word = trim( (string) preg_replace( '/\s+/u', ' ', substr( $line, 0, $at ) ) );
		$say  = trim( (string) preg_replace( '/\s+/u', ' ', substr( $line, $at + 1 ) ) );
		if ( '' === $word || '' === $say || mb_strlen( $word ) > self::SAY_WORD_MAX || mb_strlen( $say ) > self::SAY_TEXT_MAX ) {
			return null;
		}
		// Kelime harf ya da rakamla başlar ve biter (kısaltmalarda sonda nokta olabilir: "Şti."); arada boşluk
		// ve . - ' ’ & + olabilir.
		if ( ! preg_match( "/^[\\p{L}\\p{N}](?:[\\p{L}\\p{N} .\\-'’&+]*[\\p{L}\\p{N}])?\\.?$/u", $word ) ) {
			return null;
		}
		// Okunuş düz metin: HTML ya da denetim karakteri içeremez.
		if ( sanitize_text_field( $say ) !== $say || preg_match( '/[<>=]/', $say ) ) {
			return null;
		}
		return array( $word, $say );
	}

	/**
	 * Ön yüz için sözlük: array( array( kelime, okunuş ), … ).
	 *
	 * @param string $text Kayıtlı sözlük.
	 * @return array<int, array{0: string, 1: string}>
	 */
	public static function pronunciation_list( $text ) {
		$out = array();
		foreach ( self::lines( $text ) as $line ) {
			$line = trim( $line );
			if ( '' === $line || '#' === $line[0] ) {
				continue;
			}
			$pair = self::pronunciation_pair( $line );
			if ( null !== $pair ) {
				$out[] = $pair;
			}
		}
		return $out;
	}

	/**
	 * CSS seçici listesini temizler. Geçersizse null döner.
	 *
	 * Seçici yalnızca tarayıcıda querySelectorAll ile kullanılır; HTML'e yazılmaz.
	 *
	 * @param string $raw Ham seçici.
	 * @return string|null
	 */
	public static function sanitize_selector( $raw ) {
		$collapsed = trim( (string) preg_replace( '/\s+/u', ' ', $raw ) );
		$value     = trim( (string) preg_replace( '/\s+/u', ' ', sanitize_text_field( $raw ) ) );
		// Temizlik bir şey sildiyse (ör. HTML etiketi) değer sessizce değiştirilmez, reddedilir.
		if ( $value !== $collapsed ) {
			return null;
		}
		if ( '' === $value ) {
			return '';
		}
		if ( mb_strlen( $value ) > self::SELECTOR_MAX ) {
			return null;
		}
		// Harf, rakam, boşluk ve CSS seçici işaretleri: # . - _ : , > + ~ * [ ] = " ' ( ) ^ $ |.
		if ( ! preg_match( '/^[\p{L}\p{N}\s#.\-_:,>+~*\[\]="\'()^$|]+$/u', $value ) ) {
			return null;
		}
		return $value;
	}

	/**
	 * Diziden metin okur; yoksa ya da metin/sayı değilse boş metin.
	 *
	 * @param array<mixed> $input Değerler.
	 * @param string       $key   Anahtar.
	 * @return string
	 */
	private static function text( array $input, $key ) {
		return isset( $input[ $key ] ) && ( is_string( $input[ $key ] ) || is_int( $input[ $key ] ) ) ? (string) $input[ $key ] : '';
	}

	/**
	 * Diziden aralık içinde bir tam sayı okur.
	 *
	 * @param array<mixed> $input    Değerler.
	 * @param string       $key      Anahtar.
	 * @param int          $min      En küçük.
	 * @param int          $max      En büyük.
	 * @param int          $fallback Geçersizse dönecek değer.
	 * @return int
	 */
	private static function int_in_range( array $input, $key, $min, $max, $fallback ) {
		if ( ! isset( $input[ $key ] ) || ! is_numeric( $input[ $key ] ) ) {
			return $fallback;
		}
		$n = (int) $input[ $key ];
		return ( $n < $min || $n > $max ) ? $fallback : $n;
	}

	/**
	 * Aynı hatayı bir istekte bir kez gösterir (sanitize_callback ilk kayıtta iki kez çağrılabilir).
	 *
	 * @param string $code    Hata kodu.
	 * @param string $message Mesaj.
	 * @return void
	 */
	private static function error( $code, $message ) {
		/**
		 * Bu istekte gösterilen hata kodları.
		 *
		 * @var array<string, true> $shown
		 */
		static $shown = array();
		if ( isset( $shown[ $code ] ) || ! function_exists( 'add_settings_error' ) ) {
			return;
		}
		$shown[ $code ] = true;
		add_settings_error( self::OPTION, $code, $message, 'error' );
	}
}

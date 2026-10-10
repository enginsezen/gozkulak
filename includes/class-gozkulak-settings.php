<?php
/**
 * Ayarların tanımı, varsayılanları ve temizlenmesi.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Tek bir seçenekte (gozkulak_settings) tutulan site ayarları.
 */
final class GozKulak_Settings {

	const OPTION = 'gozkulak_settings';

	const POSITIONS = array( 'bottom-right', 'bottom-left', 'middle-right', 'middle-left' );

	const ICONS = array( 'person', 'eye', 'text' );

	const VISIBILITY = array( 'admins', 'everyone' );

	const SELECTOR_MAX = 500;

	const TTS_BASE_MAX = 200;

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
	 * @return array<string, mixed>
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
		);
	}

	/**
	 * Kayıtlı ayarları varsayılanlarla birleştirip türlerini garanti ederek döndürür.
	 *
	 * @return array<string, mixed>
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
	 * @return array<string, mixed>
	 */
	public static function sanitize( $input ) {
		$previous = self::get();
		if ( ! is_array( $input ) ) {
			return $previous;
		}

		$clean = self::normalize( $input, $previous, true );

		// normalize() geçersiz seçicide önceki değeri korur; burada yalnızca kullanıcıya bildirilir.
		if ( isset( $input['content_selector'] ) && null === self::sanitize_selector( (string) $input['content_selector'] ) ) {
			self::error(
				'gozkulak_selector',
				__( 'Okunacak alan seçicisi kaydedilmedi: yalnızca CSS seçicilerinde kullanılan karakterlere izin verilir ve en fazla 500 karakter olabilir.', 'gozkulak' )
			);
		}
		if ( isset( $input['tts_base'] ) && null === self::sanitize_tts_base( (string) $input['tts_base'] ) ) {
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
	 * @param array<string, mixed> $input     Ham değerler.
	 * @param array<string, mixed> $fallback  Geçersiz değerlerin yerine kullanılacak değerler.
	 * @param bool                 $from_form Form gönderimi mi (işaretlenmemiş kutular gönderilmez).
	 * @return array<string, mixed>
	 */
	private static function normalize( array $input, array $fallback, $from_form = false ) {
		$out = array();

		if ( $from_form ) {
			$out['enabled'] = ! empty( $input['enabled'] );
		} else {
			$out['enabled'] = isset( $input['enabled'] ) ? (bool) $input['enabled'] : (bool) $fallback['enabled'];
		}

		$visibility        = isset( $input['visibility'] ) ? (string) $input['visibility'] : '';
		$out['visibility'] = in_array( $visibility, self::VISIBILITY, true ) ? $visibility : $fallback['visibility'];

		$position        = isset( $input['position'] ) ? (string) $input['position'] : '';
		$out['position'] = in_array( $position, self::POSITIONS, true ) ? $position : $fallback['position'];

		$out['offset_x'] = self::int_in_range( $input, 'offset_x', 0, 200, (int) $fallback['offset_x'] );
		$out['offset_y'] = self::int_in_range( $input, 'offset_y', 0, 200, (int) $fallback['offset_y'] );
		$out['size']     = self::int_in_range( $input, 'size', 44, 80, (int) $fallback['size'] );

		$icon        = isset( $input['icon'] ) ? (string) $input['icon'] : '';
		$out['icon'] = in_array( $icon, self::ICONS, true ) ? $icon : $fallback['icon'];

		$color        = isset( $input['color'] ) ? sanitize_hex_color( (string) $input['color'] ) : null;
		$out['color'] = $color ? $color : $fallback['color'];

		$features        = isset( $input['features'] ) && is_array( $input['features'] ) ? $input['features'] : array();
		$old_features    = isset( $fallback['features'] ) && is_array( $fallback['features'] ) ? $fallback['features'] : array();
		$out['features'] = array();
		foreach ( array_keys( self::features() ) as $key ) {
			if ( $from_form || array_key_exists( $key, $features ) ) {
				$out['features'][ $key ] = ! empty( $features[ $key ] );
			} else {
				$out['features'][ $key ] = ! empty( $old_features[ $key ] );
			}
		}

		$selector                = isset( $input['content_selector'] ) ? self::sanitize_selector( (string) $input['content_selector'] ) : null;
		$out['content_selector'] = null === $selector ? (string) $fallback['content_selector'] : $selector;

		$base            = isset( $input['tts_base'] ) ? self::sanitize_tts_base( (string) $input['tts_base'] ) : null;
		$out['tts_base'] = null === $base ? (string) $fallback['tts_base'] : $base;

		if ( $from_form ) {
			$out['tts_fallback'] = ! empty( $input['tts_fallback'] );
		} else {
			$out['tts_fallback'] = isset( $input['tts_fallback'] ) ? (bool) $input['tts_fallback'] : (bool) $fallback['tts_fallback'];
		}

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
		$value = trim( (string) $raw );
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
	 * CSS seçici listesini temizler. Geçersizse null döner.
	 *
	 * Seçici yalnızca tarayıcıda querySelectorAll ile kullanılır; HTML'e yazılmaz.
	 *
	 * @param string $raw Ham seçici.
	 * @return string|null
	 */
	public static function sanitize_selector( $raw ) {
		$collapsed = trim( (string) preg_replace( '/\s+/u', ' ', (string) $raw ) );
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
	 * Diziden aralık içinde bir tam sayı okur.
	 *
	 * @param array<string, mixed> $input    Değerler.
	 * @param string               $key      Anahtar.
	 * @param int                  $min      En küçük.
	 * @param int                  $max      En büyük.
	 * @param int                  $fallback Geçersizse dönecek değer.
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
		static $shown = array();
		if ( isset( $shown[ $code ] ) || ! function_exists( 'add_settings_error' ) ) {
			return;
		}
		$shown[ $code ] = true;
		add_settings_error( self::OPTION, $code, $message, 'error' );
	}
}

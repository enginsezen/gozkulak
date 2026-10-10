<?php
/**
 * GitHub'dan imzalı güncelleme.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Yeni sürüm GitHub'daki etiketlerden (vX.Y.Z) öğrenilir ve WordPress'in güncellemeler listesine eklenir;
 * paket GitHub'ın etiket arşividir. Kurulmadan önce, açılan paketteki gozkulak.sig doğrulanır: dosya
 * listesinin Ed25519 imzası eklentiye gömülü açık anahtarla tutmalı, listedeki her dosya birebir aynı olmalı
 * (eksik, fazla ya da değişmiş dosya yok) ve sürüm kurulu olandan yeni olmalı. Doğrulama tutmazsa güncelleme
 * kurulmaz; eski sürüm yerinde kalır. GitHub hesabı ele geçirilse bile gizli anahtar olmadan paket kurulamaz.
 *
 * İmzalama: tools/surum/imzala.mjs (gizli anahtar repoda değil, sürümü çıkaranın bilgisayarında).
 */
final class GozKulak_Updater {

	const REPO = 'enginsezen/gozkulak';

	const SLUG = 'gozkulak';

	// Ed25519 açık anahtarı (base64, 32 bayt). Gizli anahtarı tools/surum/imzala.mjs kullanır.
	const PUBLIC_KEY = 'oGWeLjojzQ+xeyts98CPbWn88iG3BA6Hb0YPtMh8bH0=';

	const CACHE = 'gozkulak_update';

	const SIG_FILE = 'gozkulak.sig';

	/**
	 * Güncelleme başlarken eklenti etkin miydi (WordPress güncellemeden önce eklentiyi devre dışı bırakır).
	 *
	 * @var bool
	 */
	private static $was_active = false;

	/**
	 * Kancaları bağlar.
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'pre_set_site_transient_update_plugins', array( __CLASS__, 'check' ) );
		add_filter( 'plugins_api', array( __CLASS__, 'info' ), 10, 3 );
		add_filter( 'upgrader_pre_install', array( __CLASS__, 'remember' ), 9, 2 );
		add_filter( 'upgrader_source_selection', array( __CLASS__, 'verify' ), 10, 4 );
		// Güncellemeler → "Tekrar denetle" WordPress'in listesini siler; GitHub'ın sonucu da yeniden alınsın.
		add_action( 'delete_site_transient_update_plugins', array( __CLASS__, 'forget' ) );
	}

	/**
	 * Güncelleme başlarken eklentinin etkin olup olmadığını not eder (WordPress'in devre dışı bırakmasından önce).
	 *
	 * @param mixed $response   Önceki sonuç.
	 * @param mixed $hook_extra Ek bilgi.
	 * @return mixed
	 */
	public static function remember( $response, $hook_extra = array() ) {
		if ( is_array( $hook_extra ) && isset( $hook_extra['plugin'] ) && plugin_basename( GOZKULAK_FILE ) === $hook_extra['plugin'] ) {
			self::$was_active = is_plugin_active( $hook_extra['plugin'] );
		}
		return $response;
	}

	/**
	 * Saklanan GitHub sonucunu siler.
	 *
	 * @return void
	 */
	public static function forget() {
		delete_site_transient( self::CACHE );
	}

	/**
	 * Yalnızca geliştirme ortamında (WP_ENVIRONMENT_TYPE = local) sınama için değiştirilebilen değerler.
	 *
	 * @param string $name  Sabitin adı.
	 * @param string $value Asıl değer.
	 * @return string
	 */
	private static function setting( $name, $value ) {
		if ( 'local' === wp_get_environment_type() && defined( $name ) ) {
			$test = constant( $name );
			if ( is_string( $test ) ) {
				return $test;
			}
		}
		return $value;
	}

	/**
	 * Açık anahtar (ham 32 bayt); geçersizse boş metin.
	 *
	 * @return string
	 */
	private static function public_key() {
		$key = base64_decode( self::setting( 'GOZKULAK_TEST_PUBLIC_KEY', self::PUBLIC_KEY ), true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- imza anahtarı
		return is_string( $key ) && 32 === strlen( $key ) ? $key : '';
	}

	/**
	 * Etiket listesinin ve arşivlerin adresi.
	 *
	 * @return array{tags: string, archive: string}
	 */
	private static function source() {
		$base = self::setting( 'GOZKULAK_TEST_UPDATE_SOURCE', '' );
		if ( '' !== $base ) {
			return array(
				'tags'    => $base . 'tags',
				'archive' => $base . 'archive/',
			);
		}
		return array(
			'tags'    => 'https://api.github.com/repos/' . self::REPO . '/tags',
			'archive' => 'https://github.com/' . self::REPO . '/archive/refs/tags/',
		);
	}

	/**
	 * En yeni etiket: array( version, package ); bulunamazsa null. Sonuç 6 saat (hatada 1 saat) saklanır.
	 *
	 * @return array{version: string, package: string}|null
	 */
	private static function latest() {
		// Güncellemeler → "Tekrar denetle" (force-check) saklanan sonucu kullanmaz. Yalnızca okuma: nonce gerekmez.
		$force  = is_admin() && isset( $_GET['force-check'] ) && current_user_can( 'update_plugins' ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$cached = $force ? false : get_site_transient( self::CACHE );
		if ( is_array( $cached ) ) {
			return isset( $cached['version'], $cached['package'] ) && is_string( $cached['version'] ) && is_string( $cached['package'] )
				? array(
					'version' => $cached['version'],
					'package' => $cached['package'],
				)
				: null;
		}
		$src  = self::source();
		$res  = wp_remote_get(
			$src['tags'],
			array(
				'timeout' => 10,
				'headers' => array( 'Accept' => 'application/vnd.github+json' ),
			)
		);
		$tags = 200 === wp_remote_retrieve_response_code( $res ) ? json_decode( wp_remote_retrieve_body( $res ), true ) : null;
		if ( ! is_array( $tags ) ) {
			set_site_transient( self::CACHE, array(), HOUR_IN_SECONDS );
			return null;
		}
		$best = null;
		$tag  = '';
		foreach ( $tags as $t ) {
			$name = is_array( $t ) && isset( $t['name'] ) && is_string( $t['name'] ) ? $t['name'] : '';
			if ( preg_match( '/^v?([0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4})$/', $name, $m ) && ( null === $best || version_compare( $m[1], $best, '>' ) ) ) {
				$best = $m[1];
				$tag  = $name;
			}
		}
		$out = null === $best ? array() : array(
			'version' => $best,
			'package' => $src['archive'] . rawurlencode( $tag ) . '.zip',
		);
		set_site_transient( self::CACHE, $out, 6 * HOUR_IN_SECONDS );
		return $out ? $out : null;
	}

	/**
	 * Güncellemeler listesine eklentinin durumunu ekler.
	 *
	 * @param mixed $transient update_plugins geçicisi.
	 * @return mixed
	 */
	public static function check( $transient ) {
		if ( ! $transient instanceof stdClass ) {
			return $transient;
		}
		$latest = self::latest();
		if ( null === $latest ) {
			return $transient;
		}
		$file  = plugin_basename( GOZKULAK_FILE );
		$newer = version_compare( $latest['version'], GOZKULAK_VERSION, '>' );
		$item  = (object) array(
			'id'           => 'github.com/' . self::REPO,
			'slug'         => self::SLUG,
			'plugin'       => $file,
			'new_version'  => $newer ? $latest['version'] : GOZKULAK_VERSION,
			'url'          => 'https://github.com/' . self::REPO,
			'package'      => $newer ? $latest['package'] : '',
			'requires'     => '6.4',
			'requires_php' => '7.4',
		);
		if ( $newer ) {
			if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
				$transient->response = array();
			}
			$transient->response[ $file ] = $item;
		} else {
			if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
				$transient->no_update = array();
			}
			$transient->no_update[ $file ] = $item;
		}
		return $transient;
	}

	/**
	 * "Ayrıntıları görüntüle" penceresi.
	 *
	 * @param mixed  $result Önceki sonuç.
	 * @param string $action İstek türü.
	 * @param mixed  $args   İstek.
	 * @return mixed
	 */
	public static function info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || ! isset( $args->slug ) || self::SLUG !== $args->slug ) {
			return $result;
		}
		$latest = self::latest();
		$repo   = 'https://github.com/' . self::REPO;
		return (object) array(
			'name'          => 'GözKulak',
			'slug'          => self::SLUG,
			'version'       => null === $latest ? GOZKULAK_VERSION : $latest['version'],
			'author'        => 'Engin Sezen',
			'homepage'      => $repo,
			'requires'      => '6.4',
			'requires_php'  => '7.4',
			'download_link' => null === $latest ? '' : $latest['package'],
			'sections'      => array(
				'description' => esc_html__( 'Erişilebilirlik menüsü ve Türkçe sesli okuma. Güncellemeler GitHub\'dan gelir ve kurulmadan önce imzaları doğrulanır.', 'gozkulak' ),
				'changelog'   => '<a href="' . esc_url( $repo . '/blob/main/readme.txt' ) . '">' . esc_html__( 'Değişiklikler (readme.txt)', 'gozkulak' ) . '</a>',
			),
		);
	}

	/**
	 * Güncelleme kurulmadan önce: paketi doğrular ve klasör adını "gozkulak" yapar. Yalnızca bu eklentinin
	 * güncellemesine uygulanır (elle zip yükleme yöneticinin kendi seçimidir).
	 *
	 * @param mixed $source        Açılan paketin klasörü.
	 * @param mixed $remote_source İndirme klasörü.
	 * @param mixed $upgrader      Yükleyici.
	 * @param mixed $hook_extra    Ek bilgi.
	 * @return mixed
	 */
	public static function verify( $source, $remote_source, $upgrader, $hook_extra = array() ) {
		if ( ! is_string( $source ) || ! is_array( $hook_extra ) || ! isset( $hook_extra['plugin'] ) || plugin_basename( GOZKULAK_FILE ) !== $hook_extra['plugin'] ) {
			return $source;
		}
		$dir = trailingslashit( $source );
		$ok  = self::verify_dir( $dir, GOZKULAK_VERSION );
		if ( is_wp_error( $ok ) ) {
			// Paket kurulmadı, eski dosyalara dokunulmadı: WordPress'in güncelleme için devre dışı bıraktığı
			// eklenti yeniden etkinleştirilir (sahte bir paket menüyü sitelerden kaldıramasın).
			if ( self::$was_active && ! is_plugin_active( $hook_extra['plugin'] ) ) {
				activate_plugin( $hook_extra['plugin'], '', false, true );
			}
			return $ok;
		}
		if ( self::SLUG === basename( $dir ) ) {
			return $source;
		}
		global $wp_filesystem;
		$target = trailingslashit( dirname( $dir ) ) . self::SLUG . '/';
		if ( ! $wp_filesystem instanceof WP_Filesystem_Base || ! $wp_filesystem->move( untrailingslashit( $dir ), untrailingslashit( $target ), true ) ) {
			return new WP_Error( 'gozkulak_update_move', __( 'GözKulak güncellemesi: paket klasörü yeniden adlandırılamadı.', 'gozkulak' ) );
		}
		return $target;
	}

	/**
	 * Açılmış bir paketi doğrular.
	 *
	 * @param string $dir     Paket klasörü (sonunda /).
	 * @param string $current Kurulu sürüm; paket bundan yeni olmalı.
	 * @return true|WP_Error
	 */
	public static function verify_dir( $dir, $current ) {
		$fail = static function ( string $why ) {
			/* translators: %s: doğrulamanın neden tutmadığı */
			return new WP_Error( 'gozkulak_update_signature', sprintf( __( 'GözKulak güncellemesi kurulmadı: imza doğrulanamadı (%s). Eski sürüm yerinde kaldı.', 'gozkulak' ), $why ) );
		};

		$raw = is_file( $dir . self::SIG_FILE ) ? file_get_contents( $dir . self::SIG_FILE ) : false; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- yerel geçici dosya
		$sig = is_string( $raw ) ? json_decode( $raw, true ) : null;
		if ( ! is_array( $sig ) || ! isset( $sig['manifest'], $sig['signature'], $sig['version'] ) || ! is_string( $sig['manifest'] ) || ! is_string( $sig['signature'] ) || ! is_string( $sig['version'] ) ) {
			return $fail( 'imza dosyası yok ya da bozuk' );
		}
		$key       = self::public_key();
		$signature = base64_decode( $sig['signature'], true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- imza
		if ( '' === $key || ! is_string( $signature ) || 64 !== strlen( $signature ) ) {
			return $fail( 'anahtar ya da imza biçimi geçersiz' );
		}
		try {
			$valid = sodium_crypto_sign_verify_detached( $signature, $sig['manifest'], $key );
		} catch ( Exception $e ) {
			$valid = false;
		}
		if ( ! $valid ) {
			return $fail( 'imza tutmuyor' );
		}
		// İmzalı liste: "gozkulak X.Y.Z" ve her dosya için "<sha256> <yol>".
		$lines = explode( "\n", rtrim( $sig['manifest'], "\n" ) );
		$head  = array_shift( $lines );
		if ( ! preg_match( '/^gozkulak ([0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4})$/', (string) $head, $m ) || $m[1] !== $sig['version'] ) {
			return $fail( 'sürüm satırı geçersiz' );
		}
		$version = $m[1];
		if ( ! version_compare( $version, $current, '>' ) ) {
			return $fail( 'paket kurulu sürümden yeni değil' );
		}
		$want = array();
		foreach ( $lines as $line ) {
			if ( ! preg_match( '#^([0-9a-f]{64}) ([A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*)$#', $line, $f ) || preg_match( '#(^|/)\.\.?(/|$)#', $f[2] ) ) {
				return $fail( 'dosya listesi geçersiz' );
			}
			$want[ $f[2] ] = $f[1];
		}
		$have = array();
		$it   = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );
		foreach ( $it as $file ) {
			if ( ! $file instanceof SplFileInfo ) {
				continue;
			}
			$rel = str_replace( '\\', '/', substr( $file->getPathname(), strlen( $dir ) ) );
			if ( self::SIG_FILE === $rel ) {
				continue;
			}
			if ( $file->isLink() || ! $file->isFile() ) {
				return $fail( 'beklenmeyen dosya türü: ' . $rel );
			}
			$have[ $rel ] = true;
		}
		$extra   = array_diff_key( $have, $want );
		$missing = array_diff_key( $want, $have );
		if ( $extra ) {
			return $fail( 'listede olmayan dosya: ' . implode( ', ', array_slice( array_keys( $extra ), 0, 3 ) ) );
		}
		if ( $missing ) {
			return $fail( 'eksik dosya: ' . implode( ', ', array_slice( array_keys( $missing ), 0, 3 ) ) );
		}
		foreach ( $want as $rel => $hash ) {
			if ( hash_file( 'sha256', $dir . $rel ) !== $hash ) {
				return $fail( 'değişmiş dosya: ' . $rel );
			}
		}
		$data = get_file_data( $dir . 'gozkulak.php', array( 'Version' => 'Version' ) );
		if ( $data['Version'] !== $version ) {
			return $fail( 'eklenti başlığındaki sürüm imzadakiyle uyuşmuyor' );
		}
		return true;
	}
}

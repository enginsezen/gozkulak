<?php
/**
 * Ön yüz: menü betiğini ve ayarları sayfaya ekler.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Menü betiği her sayfada küçük bir dosya olarak yüklenir; ayarlar çalıştırılmayan
 * bir JSON bloğu olarak aktarılır (CSP'de satır içi betik izni gerektirmez).
 */
final class GozKulak_Frontend {

	/**
	 * Kancaları bağlar.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_action( 'wp_footer', array( __CLASS__, 'print_config' ), 5 );
	}

	/**
	 * Menünün bu istekte gösterilip gösterilmeyeceği.
	 *
	 * @return bool
	 */
	private static function active() {
		if ( is_admin() || is_feed() || is_embed() || wp_doing_ajax() ) {
			return false;
		}
		$settings = GozKulak_Settings::get();
		if ( ! $settings['enabled'] ) {
			return false;
		}
		// Test modu: canlı sitede yalnızca yöneticiler görür, ziyaretçilere hiçbir dosya yüklenmez.
		if ( 'everyone' !== $settings['visibility'] && ! current_user_can( 'manage_options' ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Sayfaya uygulanan stiller ve menü betiği.
	 *
	 * @return void
	 */
	public static function enqueue() {
		if ( ! self::active() ) {
			return;
		}
		wp_enqueue_script(
			'gozkulak',
			GOZKULAK_URL . 'assets/js/gozkulak.js',
			array(),
			GOZKULAK_VERSION,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}

	/**
	 * Ayarları JSON olarak yazar. JSON_HEX_* bayrakları "</script>" kaçışını önler.
	 *
	 * @return void
	 */
	public static function print_config() {
		if ( ! self::active() || ! wp_script_is( 'gozkulak', 'enqueued' ) ) {
			return;
		}
		$s        = GozKulak_Settings::get();
		$features = array_keys( array_filter( $s['features'] ) );
		$config   = array(
			'version'  => GOZKULAK_VERSION,
			'testMode' => 'everyone' !== $s['visibility'],
			'css'      => GOZKULAK_URL . 'assets/css/menu.css?ver=' . rawurlencode( GOZKULAK_VERSION ),
			'pageCss'  => GOZKULAK_URL . 'assets/css/page.css?ver=' . rawurlencode( GOZKULAK_VERSION ),
			'position' => $s['position'],
			'offset'   => array( (int) $s['offset_x'], (int) $s['offset_y'] ),
			'size'     => (int) $s['size'],
			'icon'     => $s['icon'],
			'color'    => $s['color'],
			'features' => $features,
			'selector' => $s['content_selector'],
		);
		$json     = wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		if ( false === $json ) {
			return;
		}
		wp_print_inline_script_tag(
			$json,
			array(
				'type' => 'application/json',
				'id'   => 'gozkulak-config',
			)
		);
	}
}

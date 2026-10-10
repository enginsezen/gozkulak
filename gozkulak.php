<?php
/**
 * Plugin Name:       GözKulak
 * Description:       Erişilebilirlik menüsü ve Türkçe sesli okuma. Ses ziyaretçinin tarayıcısında üretilir; ziyaretçiden veri toplanmaz.
 * Version:           0.3.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Engin Sezen
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gozkulak
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

define( 'GOZKULAK_VERSION', '0.3.0' );
define( 'GOZKULAK_FILE', __FILE__ );
define( 'GOZKULAK_DIR', plugin_dir_path( __FILE__ ) );
define( 'GOZKULAK_URL', plugin_dir_url( __FILE__ ) );

require_once GOZKULAK_DIR . 'includes/class-gozkulak-settings.php';
require_once GOZKULAK_DIR . 'includes/class-gozkulak-frontend.php';
require_once GOZKULAK_DIR . 'includes/class-gozkulak-audio.php';

if ( is_admin() ) {
	require_once GOZKULAK_DIR . 'includes/class-gozkulak-admin.php';
	GozKulak_Admin::init();
}

GozKulak_Frontend::init();
GozKulak_Audio::init();

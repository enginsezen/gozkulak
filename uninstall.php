<?php
/**
 * Eklenti silinince kendi ayarlarını, hazır ses dosyalarını ve sayfa listelerini kaldırır.
 *
 * @package GozKulak
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-gozkulak-audio.php';

delete_option( 'gozkulak_settings' );
delete_site_transient( 'gozkulak_update' );
delete_site_option( 'gozkulak_update_status' );
GozKulak_Audio::uninstall();

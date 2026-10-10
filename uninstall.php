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
GozKulak_Audio::uninstall();

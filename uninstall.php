<?php
/**
 * Eklenti silinince kendi ayarlarını kaldırır.
 *
 * @package GozKulak
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'gozkulak_settings' );

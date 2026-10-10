<?php
/**
 * Hazır ses: yöneticinin tarayıcısında üretilip siteye yüklenen cümle ses dosyaları.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ses, cümle cümle Ogg Opus dosyaları olarak uploads/gozkulak/ altında saklanır. Dosya adı, cümlenin
 * okunacak metninin özetidir (tarayıcıda hesaplanır). Her yazının meta alanında o sayfa için hazırlanan
 * dosyaların listesi tutulur ve ön yüze yalnızca bu liste verilir.
 *
 * REST yolları yalnızca yöneticilere açıktır (manage_options + REST nonce'u). Ziyaretçiye açık uç yoktur.
 */
final class GozKulak_Audio {

	const META = '_gozkulak_audio';

	const DIR = 'gozkulak';

	const NS = 'gozkulak/v1';

	const HASH = '/^[0-9a-f]{32}$/';

	const MAX_BYTES = 524288;

	const MAX_LIST = 5000;

	/**
	 * Kancaları bağlar.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * REST yolları.
	 *
	 * @return void
	 */
	public static function routes() {
		register_rest_route(
			self::NS,
			'/audio/(?P<hash>[0-9a-f]{32})',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'upload' ),
				'permission_callback' => array( __CLASS__, 'allowed' ),
			)
		);
		register_rest_route(
			self::NS,
			'/page/(?P<id>[0-9]+)',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'save_page' ),
				'permission_callback' => array( __CLASS__, 'allowed' ),
			)
		);
		register_rest_route(
			self::NS,
			'/cleanup',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'cleanup' ),
				'permission_callback' => array( __CLASS__, 'allowed' ),
			)
		);
		register_rest_route(
			self::NS,
			'/purge',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'purge' ),
				'permission_callback' => array( __CLASS__, 'allowed' ),
			)
		);
	}

	/**
	 * Yalnızca yöneticiler. Çerezle gelen istekte REST nonce'u yoksa WordPress kullanıcıyı oturumsuz sayar.
	 *
	 * @return bool
	 */
	public static function allowed() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Tek bir ses dosyasını kaydeder. Gövde: ham Ogg Opus baytları.
	 *
	 * @param WP_REST_Request $request İstek.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload( WP_REST_Request $request ) {
		$hash = (string) $request['hash'];
		if ( ! preg_match( self::HASH, $hash ) ) {
			return self::fail( 'gozkulak_hash', __( 'Geçersiz dosya adı.', 'gozkulak' ) );
		}
		$body = (string) $request->get_body();
		if ( ! self::is_opus( $body ) ) {
			return self::fail( 'gozkulak_body', __( 'Dosya Ogg Opus değil ya da çok büyük.', 'gozkulak' ) );
		}
		$fs = self::fs();
		if ( ! $fs ) {
			return self::fail( 'gozkulak_fs', __( 'Dosya sistemine yazılamıyor.', 'gozkulak' ), 500 );
		}
		$dir = self::dir() . substr( $hash, 0, 2 ) . '/';
		if ( ! wp_mkdir_p( $dir ) ) {
			return self::fail( 'gozkulak_fs', __( 'Klasör oluşturulamadı.', 'gozkulak' ), 500 );
		}
		self::guard( self::dir() );
		if ( ! $fs->put_contents( $dir . $hash . '.ogg', $body, FS_CHMOD_FILE ) ) {
			return self::fail( 'gozkulak_fs', __( 'Dosya yazılamadı.', 'gozkulak' ), 500 );
		}
		return rest_ensure_response( array( 'saved' => $hash ) );
	}

	/**
	 * Bir sayfanın hazır ses listesini kaydeder. Gövde: {"files": ["<özet>", …]}.
	 * Listeye yalnızca diskte bulunan dosyalar yazılır; eksikler yanıtta döner.
	 *
	 * @param WP_REST_Request $request İstek.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_page( WP_REST_Request $request ) {
		$post = get_post( (int) $request['id'] );
		if ( ! $post || ! is_post_publicly_viewable( $post ) ) {
			return self::fail( 'gozkulak_post', __( 'Yayımlanmış bir sayfa bulunamadı.', 'gozkulak' ), 404 );
		}
		$files = $request->get_param( 'files' );
		if ( ! is_array( $files ) || count( $files ) > self::MAX_LIST ) {
			return self::fail( 'gozkulak_list', __( 'Geçersiz dosya listesi.', 'gozkulak' ) );
		}
		$keep    = array();
		$missing = array();
		foreach ( $files as $hash ) {
			if ( ! is_string( $hash ) || ! preg_match( self::HASH, $hash ) ) {
				return self::fail( 'gozkulak_list', __( 'Geçersiz dosya listesi.', 'gozkulak' ) );
			}
			if ( isset( $keep[ $hash ] ) ) {
				continue;
			}
			if ( is_file( self::path( $hash ) ) ) {
				$keep[ $hash ] = true;
			} else {
				$missing[] = $hash;
			}
		}
		$list = array_keys( $keep );
		if ( $list ) {
			update_post_meta( $post->ID, self::META, implode( ',', $list ) );
		} else {
			delete_post_meta( $post->ID, self::META );
		}
		return rest_ensure_response(
			array(
				'saved'   => count( $list ),
				'missing' => $missing,
			)
		);
	}

	/**
	 * Hiçbir sayfanın listesinde olmayan dosyaları siler.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function cleanup() {
		$used = array();
		foreach ( self::all_lists() as $csv ) {
			foreach ( explode( ',', $csv ) as $hash ) {
				$used[ $hash ] = true;
			}
		}
		$deleted = 0;
		foreach ( self::files() as $hash => $file ) {
			if ( ! isset( $used[ $hash ] ) && wp_delete_file_from_directory( $file, self::dir() ) ) {
				++$deleted;
			}
		}
		return rest_ensure_response( array( 'deleted' => $deleted ) );
	}

	/**
	 * Bütün hazır sesleri ve sayfa listelerini siler.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function purge() {
		delete_post_meta_by_key( self::META );
		self::remove_all();
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/**
	 * Eklenti kaldırılırken: dosyalar ve meta alanları silinir.
	 *
	 * @return void
	 */
	public static function uninstall() {
		delete_post_meta_by_key( self::META );
		self::remove_all();
	}

	/**
	 * Ön yüz için bu sayfanın hazır ses bilgisi; yoksa null.
	 *
	 * @return array<string, mixed>|null
	 */
	public static function for_page() {
		if ( ! is_singular() ) {
			return null;
		}
		$csv = (string) get_post_meta( (int) get_queried_object_id(), self::META, true );
		if ( '' === $csv ) {
			return null;
		}
		$files = array_values( array_filter( explode( ',', $csv ), array( __CLASS__, 'valid_hash' ) ) );
		if ( ! $files ) {
			return null;
		}
		return array(
			'base'  => self::base_url(),
			'files' => $files,
		);
	}

	/**
	 * Bir sayfanın hazır ses dosyası sayısı.
	 *
	 * @param int $post_id Yazı.
	 * @return int
	 */
	public static function count( $post_id ) {
		$csv = (string) get_post_meta( (int) $post_id, self::META, true );
		return '' === $csv ? 0 : substr_count( $csv, ',' ) + 1;
	}

	/**
	 * Özet biçimi doğru mu.
	 *
	 * @param mixed $hash Değer.
	 * @return bool
	 */
	public static function valid_hash( $hash ) {
		return is_string( $hash ) && 1 === preg_match( self::HASH, $hash );
	}

	/**
	 * Gövde bir Ogg Opus dosyasının başı mı: ilk sayfa "OggS" ve tek parçada "OpusHead".
	 *
	 * @param string $body Baytlar.
	 * @return bool
	 */
	private static function is_opus( $body ) {
		$len = strlen( $body );
		return $len > 47 && $len <= self::MAX_BYTES && 'OggS' === substr( $body, 0, 4 ) && 'OpusHead' === substr( $body, 28, 8 );
	}

	/**
	 * Hazır ses klasörü (sonunda /).
	 *
	 * @return string
	 */
	private static function dir() {
		$up = wp_upload_dir( null, false );
		return trailingslashit( $up['basedir'] ) . self::DIR . '/';
	}

	/**
	 * Hazır ses klasörünün adresi (sonunda /).
	 *
	 * @return string
	 */
	public static function base_url() {
		$up = wp_upload_dir( null, false );
		return set_url_scheme( trailingslashit( $up['baseurl'] ) . self::DIR . '/' );
	}

	/**
	 * Bir dosyanın yolu.
	 *
	 * @param string $hash Özet.
	 * @return string
	 */
	private static function path( $hash ) {
		return self::dir() . substr( $hash, 0, 2 ) . '/' . $hash . '.ogg';
	}

	/**
	 * Klasör listelenmesin diye boş bir index.php.
	 *
	 * @param string $dir Klasör.
	 * @return void
	 */
	private static function guard( $dir ) {
		$fs = self::fs();
		if ( $fs && ! is_file( $dir . 'index.php' ) ) {
			$fs->put_contents( $dir . 'index.php', "<?php\n// Silence is golden.\n", FS_CHMOD_FILE );
		}
	}

	/**
	 * Diskteki hazır ses dosyaları: özet => yol.
	 *
	 * @return array<string, string>
	 */
	private static function files() {
		$out = array();
		$dir = self::dir();
		if ( ! is_dir( $dir ) ) {
			return $out;
		}
		$found = glob( $dir . '[0-9a-f][0-9a-f]/*.ogg' );
		foreach ( is_array( $found ) ? $found : array() as $file ) {
			$hash = basename( $file, '.ogg' );
			if ( self::valid_hash( $hash ) ) {
				$out[ $hash ] = $file;
			}
		}
		return $out;
	}

	/**
	 * Bütün sayfaların listeleri (virgülle ayrılmış özetler).
	 *
	 * @return string[]
	 */
	private static function all_lists() {
		global $wpdb;
		// Meta değerleri toplu okunur; sonuç önbelleğe alınmaz (yalnızca temizlikte, yönetici isteğiyle).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_col( $wpdb->prepare( "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s", self::META ) );
		return is_array( $rows ) ? array_map( 'strval', $rows ) : array();
	}

	/**
	 * Hazır ses klasörünü tümüyle siler.
	 *
	 * @return void
	 */
	private static function remove_all() {
		$fs  = self::fs();
		$dir = self::dir();
		if ( $fs && is_dir( $dir ) ) {
			$fs->rmdir( $dir, true );
		}
	}

	/**
	 * WordPress dosya sistemi (doğrudan erişim); kullanılamıyorsa null.
	 *
	 * @return WP_Filesystem_Base|null
	 */
	private static function fs() {
		global $wp_filesystem;
		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		if ( 'direct' !== get_filesystem_method() || ! WP_Filesystem() ) {
			return null;
		}
		return $wp_filesystem;
	}

	/**
	 * Hata yanıtı.
	 *
	 * @param string $code    Kod.
	 * @param string $message Mesaj.
	 * @param int    $status  HTTP durumu.
	 * @return WP_Error
	 */
	private static function fail( $code, $message, $status = 400 ) {
		return new WP_Error( $code, $message, array( 'status' => $status ) );
	}
}

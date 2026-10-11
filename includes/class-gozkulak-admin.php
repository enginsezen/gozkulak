<?php
/**
 * Yönetici ayar sayfası: Ayarlar → GözKulak.
 *
 * @package GozKulak
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ayar sayfası. Kayıt Settings API ile yapılır: options.php nonce'u ve
 * manage_options yetkisini denetler, değerler GozKulak_Settings::sanitize'dan geçer.
 *
 * @phpstan-import-type Settings from GozKulak_Settings
 */
final class GozKulak_Admin {

	const PAGE = 'gozkulak';

	const PREPARE_MAX = 1000;

	/**
	 * Kancaları bağlar.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( GOZKULAK_FILE ), array( __CLASS__, 'action_links' ) );
		add_filter( 'option_page_capability_' . self::PAGE, array( __CLASS__, 'capability' ) );
	}

	/**
	 * Ayar sayfasını Ayarlar menüsüne ekler.
	 *
	 * @return void
	 */
	public static function menu() {
		add_options_page(
			__( 'GözKulak', 'gozkulak' ),
			__( 'GözKulak', 'gozkulak' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * Ayarı kaydeder. REST API'ye açılmaz.
	 *
	 * @return void
	 */
	public static function register() {
		register_setting(
			self::PAGE,
			GozKulak_Settings::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'GozKulak_Settings', 'sanitize' ),
				'default'           => GozKulak_Settings::defaults(),
				'show_in_rest'      => false,
			)
		);
	}

	/**
	 * Ayarları kaydetmek için gereken yetki.
	 *
	 * @return string
	 */
	public static function capability() {
		return 'manage_options';
	}

	/**
	 * Eklenti listesine "Ayarlar" bağlantısı ekler.
	 *
	 * @param array<int|string, string> $links Mevcut bağlantılar.
	 * @return array<int|string, string>
	 */
	public static function action_links( $links ) {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Ayarlar', 'gozkulak' ) . '</a>' );
		return $links;
	}

	/**
	 * Renk seçiciyi yalnızca bu sayfada yükler.
	 *
	 * @param string $hook Sayfa kancası.
	 * @return void
	 */
	public static function assets( $hook ) {
		if ( 'settings_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_style( 'gozkulak-admin', GOZKULAK_URL . 'assets/css/admin.css', array(), GOZKULAK_VERSION );
		wp_enqueue_script( 'gozkulak-admin', GOZKULAK_URL . 'assets/js/admin.js', array( 'wp-color-picker' ), GOZKULAK_VERSION, true );
		wp_enqueue_script( 'gozkulak-opus', GOZKULAK_URL . 'assets/js/gozkulak-opus.js', array(), GOZKULAK_VERSION, true );
		wp_enqueue_script( 'gozkulak-prepare', GOZKULAK_URL . 'assets/js/gozkulak-prepare.js', array( 'gozkulak-opus' ), GOZKULAK_VERSION, true );
	}

	/**
	 * Özellik etiketleri.
	 *
	 * @return array<string, string>
	 */
	private static function feature_labels() {
		return array(
			'font_size'       => __( 'Yazı boyutu', 'gozkulak' ),
			'line_height'     => __( 'Satır aralığı', 'gozkulak' ),
			'letter_spacing'  => __( 'Harf aralığı', 'gozkulak' ),
			'contrast'        => __( 'Yüksek kontrast', 'gozkulak' ),
			'dark_mode'       => __( 'Koyu mod', 'gozkulak' ),
			'grayscale'       => __( 'Gri tonlama', 'gozkulak' ),
			'readable_font'   => __( 'Okunaklı yazı tipi', 'gozkulak' ),
			'highlight_links' => __( 'Bağlantıları vurgulama', 'gozkulak' ),
			'big_cursor'      => __( 'Büyük imleç', 'gozkulak' ),
			'reading_mask'    => __( 'Okuma maskesi', 'gozkulak' ),
			'reading_guide'   => __( 'Okuma cetveli', 'gozkulak' ),
			'stop_animations' => __( 'Animasyonları durdurma', 'gozkulak' ),
			'hide_images'     => __( 'Görselleri gizleme', 'gozkulak' ),
			'text_to_speech'  => __( 'Sesli okuma (sayfayı, seçili metni ya da tıklanan yeri okur)', 'gozkulak' ),
		);
	}

	/**
	 * Ayar sayfasını çizer. Tüm çıktılar escape edilir.
	 *
	 * @return void
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$s      = GozKulak_Settings::get();
		$name   = GozKulak_Settings::OPTION;
		$labels = self::feature_labels();
		$groups = array(
			'speech'  => __( 'Sesli okuma', 'gozkulak' ),
			'vision'  => __( 'Görme', 'gozkulak' ),
			'reading' => __( 'Okuma ve dikkat', 'gozkulak' ),
		);

		$positions = array(
			'bottom-right' => __( 'Sağ alt', 'gozkulak' ),
			'bottom-left'  => __( 'Sol alt', 'gozkulak' ),
			'middle-right' => __( 'Sağ orta', 'gozkulak' ),
			'middle-left'  => __( 'Sol orta', 'gozkulak' ),
		);
		$icons     = array(
			'person' => __( 'Erişilebilirlik simgesi', 'gozkulak' ),
			'eye'    => __( 'Göz', 'gozkulak' ),
			'text'   => __( 'Aa', 'gozkulak' ),
		);
		?>
		<div class="wrap gozkulak-admin">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<p><?php esc_html_e( 'Erişilebilirlik menüsünün görünümü ve hangi özelliklerin sunulacağı. Ziyaretçilerin seçimleri yalnızca kendi tarayıcılarında saklanır.', 'gozkulak' ); ?></p>

			<form method="post" action="options.php">
				<?php settings_fields( self::PAGE ); ?>

				<h2><?php esc_html_e( 'Genel', 'gozkulak' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Menü', 'gozkulak' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="<?php echo esc_attr( $name ); ?>[enabled]" value="1" <?php checked( $s['enabled'] ); ?>>
								<?php esc_html_e( 'Menüyü sitede göster', 'gozkulak' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Kimler görsün', 'gozkulak' ); ?></th>
						<td>
							<fieldset>
								<legend class="screen-reader-text"><?php esc_html_e( 'Kimler görsün', 'gozkulak' ); ?></legend>
								<label class="gozkulak-feature">
									<input type="radio" name="<?php echo esc_attr( $name ); ?>[visibility]" value="admins" <?php checked( $s['visibility'], 'admins' ); ?>>
									<?php esc_html_e( 'Yalnızca yöneticiler (test modu)', 'gozkulak' ); ?>
								</label>
								<label class="gozkulak-feature">
									<input type="radio" name="<?php echo esc_attr( $name ); ?>[visibility]" value="everyone" <?php checked( $s['visibility'], 'everyone' ); ?>>
									<?php esc_html_e( 'Herkes', 'gozkulak' ); ?>
								</label>
							</fieldset>
							<p class="description"><?php esc_html_e( 'Test modunda menü yalnızca yönetici olarak giriş yapmışken görünür; ziyaretçilere hiçbir dosya yüklenmez. Önbellek eklentisi kullanılıyorsa giriş yapmış kullanıcıların sayfalarının önbelleğe alınmadığından emin olun.', 'gozkulak' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="gozkulak-position"><?php esc_html_e( 'Konum', 'gozkulak' ); ?></label></th>
						<td>
							<select id="gozkulak-position" name="<?php echo esc_attr( $name ); ?>[position]">
								<?php foreach ( $positions as $value => $label ) : ?>
									<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s['position'], $value ); ?>><?php echo esc_html( $label ); ?></option>
								<?php endforeach; ?>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Kenardan uzaklık', 'gozkulak' ); ?></th>
						<td>
							<label>
								<?php esc_html_e( 'Yatay', 'gozkulak' ); ?>
								<input type="number" class="small-text" min="0" max="200" step="1" name="<?php echo esc_attr( $name ); ?>[offset_x]" value="<?php echo esc_attr( (string) $s['offset_x'] ); ?>"> px
							</label>
							&nbsp;
							<label>
								<?php esc_html_e( 'Dikey', 'gozkulak' ); ?>
								<input type="number" class="small-text" min="0" max="200" step="1" name="<?php echo esc_attr( $name ); ?>[offset_y]" value="<?php echo esc_attr( (string) $s['offset_y'] ); ?>"> px
							</label>
							<p class="description"><?php esc_html_e( 'Sitede aynı köşede başka bir düğme (ör. WhatsApp) varsa çakışmayı önlemek için kullanın.', 'gozkulak' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="gozkulak-size"><?php esc_html_e( 'Düğme boyutu', 'gozkulak' ); ?></label></th>
						<td>
							<input id="gozkulak-size" type="number" class="small-text" min="44" max="80" step="1" name="<?php echo esc_attr( $name ); ?>[size]" value="<?php echo esc_attr( (string) $s['size'] ); ?>"> px
							<p class="description"><?php esc_html_e( '44 ile 80 arası. Dokunmatik ekranlar için en az 44 px önerilir.', 'gozkulak' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Simge', 'gozkulak' ); ?></th>
						<td>
							<fieldset>
								<legend class="screen-reader-text"><?php esc_html_e( 'Simge', 'gozkulak' ); ?></legend>
								<?php foreach ( $icons as $value => $label ) : ?>
									<label class="gozkulak-inline">
										<input type="radio" name="<?php echo esc_attr( $name ); ?>[icon]" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['icon'], $value ); ?>>
										<?php echo esc_html( $label ); ?>
									</label>
								<?php endforeach; ?>
							</fieldset>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="gozkulak-color"><?php esc_html_e( 'Renk', 'gozkulak' ); ?></label></th>
						<td>
							<input id="gozkulak-color" type="text" class="gozkulak-color" data-default-color="#085e9d" name="<?php echo esc_attr( $name ); ?>[color]" value="<?php echo esc_attr( $s['color'] ); ?>">
							<p class="description"><?php esc_html_e( 'Düğme ve menü vurgusu. Simge rengi okunaklı kalacak şekilde siyah ya da beyaz seçilir.', 'gozkulak' ); ?></p>
						</td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Menüde sunulacak özellikler', 'gozkulak' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php foreach ( $groups as $group => $group_label ) : ?>
						<tr>
							<th scope="row"><?php echo esc_html( $group_label ); ?></th>
							<td>
								<fieldset>
									<legend class="screen-reader-text"><?php echo esc_html( $group_label ); ?></legend>
									<?php foreach ( GozKulak_Settings::features() as $key => $feature_group ) : ?>
										<?php
										if ( $feature_group !== $group ) {
											continue;
										}
										?>
										<label class="gozkulak-feature">
											<input type="checkbox" name="<?php echo esc_attr( $name ); ?>[features][<?php echo esc_attr( $key ); ?>]" value="1" <?php checked( ! empty( $s['features'][ $key ] ) ); ?>>
											<?php echo esc_html( isset( $labels[ $key ] ) ? $labels[ $key ] : $key ); ?>
										</label>
									<?php endforeach; ?>
								</fieldset>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>

				<h2><?php esc_html_e( 'Sesli okuma', 'gozkulak' ); ?></h2>
				<p><?php esc_html_e( 'Türkçe sayfalar, ziyaretçi kapatmadıysa doğal sesle (EMA Lightning, yapay zekâ) okunur. Ses ziyaretçinin tarayıcısında üretilir ya da sitenizde önceden hazırlanmış ses dosyalarından (Hazır ses) çalınır; okunan metin hiçbir ses servisine gönderilmez. İngilizce sayfalarda ve doğal sesin çalışmadığı cihazlarda tarayıcının kendi sesi kullanılır.', 'gozkulak' ); ?></p>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="gozkulak-selector"><?php esc_html_e( 'Okunacak alan (CSS seçici)', 'gozkulak' ); ?></label></th>
						<td>
							<input id="gozkulak-selector" type="text" class="large-text code" maxlength="500" name="<?php echo esc_attr( $name ); ?>[content_selector]" value="<?php echo esc_attr( $s['content_selector'] ); ?>" placeholder="#Content">
							<p class="description">
								<?php esc_html_e( 'Virgülle ayrılmış seçiciler. Sayfada eşleşmeyen seçici yok sayılır; hiçbiri eşleşmezse ana içerik otomatik bulunur. Boş bırakılırsa her zaman otomatik bulunur.', 'gozkulak' ); ?>
							</p>
							<p class="description">
								<?php esc_html_e( 'Örnekler:', 'gozkulak' ); ?>
								<code>#titlebar, #listing-overview, .opening-hours, .listing-details-sidebar, .post-content</code> (Listeo),
								<code>article .entry-content</code> (Blocksy),
								<code>#Content</code> (BeTheme)
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="gozkulak-say"><?php esc_html_e( 'Okunuş sözlüğü', 'gozkulak' ); ?></label></th>
						<td>
							<textarea id="gozkulak-say" class="large-text code" rows="6" name="<?php echo esc_attr( $name ); ?>[pronunciations]" placeholder="Wireless = vayırlıs&#10;ABC = ABC"><?php echo esc_textarea( $s['pronunciations'] ); ?></textarea>
							<p class="description">
								<?php esc_html_e( 'Sitenize özel kelimelerin nasıl okunacağı. Her satıra "kelime = okunuş" yazın; # ile başlayan satırlar açıklamadır. Büyük-küçük harf fark etmez, yalnızca bütün kelime eşleşir ("ABC" kelimesi "ABC\'nin" içinde de eşleşir). Okunuşu Türkçe okunduğu gibi yazın (ör. "Wireless = vayırlıs"). Bir kısaltma harf harf okunsun istiyorsanız kendisiyle eşleştirin (ör. "ABC = ABC"); bu, İngilizce sayfalarda da geçerlidir. Diğer okunuşlar yalnızca Türkçe sayfalarda uygulanır.', 'gozkulak' ); ?>
							</p>
							<p class="description"><?php esc_html_e( 'Sözlük değişince, değişen kelimeleri içeren sayfaların hazır sesi yeniden hazırlanmalıdır.', 'gozkulak' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="gozkulak-tts-base"><?php esc_html_e( 'Ses dosyalarının adresi', 'gozkulak' ); ?></label></th>
						<td>
							<input id="gozkulak-tts-base" type="url" class="regular-text code" maxlength="200" name="<?php echo esc_attr( $name ); ?>[tts_base]" value="<?php echo esc_attr( $s['tts_base'] ); ?>" placeholder="https://ses.example.com/">
							<p class="description">
								<?php esc_html_e( 'Doğal sesin model ve ONNX Runtime dosyalarının bulunduğu kendi sunucunuz. Dosyalar bu adresin altındaki şu klasörlerde aranır:', 'gozkulak' ); ?>
								<code>ema-lightning-onnx/13c431d/</code>, <code>onnxruntime-web/1.30.0/</code>
							</p>
							<p class="description">
								<?php esc_html_e( 'Boş bırakılırsa dosyalar sürüme sabitlenmiş Hugging Face (model) ve jsDelivr (ONNX Runtime) adreslerinden indirilir. Her dosya SHA-256 ile doğrulanır; tutmayan dosya kullanılmaz. Dosyalar yalnızca ziyaretçi doğal sesle dinlemeyi onayladığında indirilir.', 'gozkulak' ); ?>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Yedek kaynaklar', 'gozkulak' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="<?php echo esc_attr( $name ); ?>[tts_fallback]" value="1" <?php checked( $s['tts_fallback'] ); ?>>
								<?php esc_html_e( 'Kendi sunucumdan alınamayan dosyaları Hugging Face ve jsDelivr\'den indir', 'gozkulak' ); ?>
							</label>
							<p class="description">
								<?php esc_html_e( 'Kapatılırsa ziyaretçinin tarayıcısı yalnızca yukarıdaki adrese bağlanır (ziyaretçinin IP adresi üçüncü taraflara gitmez); o sunucuya ulaşılamazsa tarayıcının kendi sesi kullanılır. Adres boşsa bu seçenek etkisizdir.', 'gozkulak' ); ?>
							</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Hazır ses', 'gozkulak' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="<?php echo esc_attr( $name ); ?>[prepared_audio]" value="1" <?php checked( $s['prepared_audio'] ); ?>>
								<?php esc_html_e( 'Önceden hazırlanmış ses dosyalarını kullan', 'gozkulak' ); ?>
							</label>
							<p class="description">
								<?php esc_html_e( 'Hazırlanmış cümleler sitenizden ses dosyası olarak çalınır; ziyaretçi modeli indirmez. Hazırlanmamış cümleler ziyaretçinin tarayıcısında üretilir.', 'gozkulak' ); ?>
							</p>
						</td>
					</tr>
				</table>

				<?php submit_button(); ?>
			</form>

			<?php self::render_update(); ?>

			<?php self::render_prepare( $s ); ?>
		</div>
		<?php
	}

	/**
	 * Sitenin tarih ve saat biçimiyle bir zaman.
	 *
	 * @param int $time Unix zamanı.
	 * @return string
	 */
	private static function when( $time ) {
		$date = get_option( 'date_format' );
		$hour = get_option( 'time_format' );
		$out  = wp_date( ( is_string( $date ) ? $date : 'Y-m-d' ) . ' ' . ( is_string( $hour ) ? $hour : 'H:i' ), $time );
		return is_string( $out ) ? $out : '';
	}

	/**
	 * Güncelleme durumu: kurulu sürüm, GitHub'daki en yeni sürüm, son denetim ve varsa hatası.
	 *
	 * @return void
	 */
	private static function render_update() {
		$st = GozKulak_Updater::status();
		?>
		<h2><?php esc_html_e( 'Güncelleme', 'gozkulak' ); ?></h2>
		<p>
			<?php
			echo esc_html(
				sprintf(
					/* translators: %s: sürüm */
					__( 'Kurulu sürüm: %s.', 'gozkulak' ),
					GozKulak_Updater::installed()
				)
			);
			echo ' ';
			if ( ! $st['time'] ) {
				esc_html_e( 'GitHub henüz denetlenmedi.', 'gozkulak' );
			} elseif ( '' !== $st['error'] ) {
				echo esc_html(
					sprintf(
						/* translators: 1: tarih, 2: hata */
						__( 'Son denetim (%1$s) başarısız: %2$s.', 'gozkulak' ),
						self::when( $st['time'] ),
						$st['error']
					)
				);
			} else {
				echo esc_html(
					sprintf(
						/* translators: 1: sürüm, 2: tarih */
						__( 'GitHub\'daki en yeni sürüm: %1$s (son denetim %2$s).', 'gozkulak' ),
						$st['latest'],
						self::when( $st['time'] )
					)
				);
			}
			?>
			<a href="<?php echo esc_url( self_admin_url( 'update-core.php?force-check=1' ) ); ?>"><?php esc_html_e( 'Şimdi denetle', 'gozkulak' ); ?></a>
		</p>
		<p class="description"><?php esc_html_e( 'Güncellemeler GitHub\'dan gelir ve kurulmadan önce imzaları doğrulanır.', 'gozkulak' ); ?></p>
		<?php
	}

	/**
	 * Hazır ses bölümü: sayfa listesi ve hazırlama düğmeleri. Hazırlamayı gozkulak-prepare.js yapar;
	 * REST nonce'u yalnızca bu yönetici sayfasına yazılır.
	 *
	 * @param array $s Ayarlar.
	 * @return void
	 *
	 * @phpstan-param Settings $s
	 */
	private static function render_prepare( array $s ) {
		$types  = array_diff( get_post_types( array( 'public' => true ) ), array( 'attachment' ) );
		$posts  = get_posts(
			array(
				'post_type'        => array_values( $types ),
				'post_status'      => 'publish',
				'has_password'     => false,
				'numberposts'      => self::PREPARE_MAX,
				'orderby'          => 'modified',
				'order'            => 'DESC',
				'suppress_filters' => false,
			)
		);
		$labels = array();
		foreach ( $types as $type ) {
			$obj             = get_post_type_object( $type );
			$name            = $obj ? $obj->labels->singular_name : null;
			$labels[ $type ] = is_string( $name ) && '' !== $name ? $name : $type;
		}
		$config = array(
			'rest'     => esc_url_raw( rest_url( GozKulak_Audio::NS . '/' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'worker'   => GOZKULAK_URL . 'assets/js/gozkulak-tts-worker.js?ver=' . rawurlencode( GOZKULAK_VERSION ),
			'base'     => $s['tts_base'],
			'fallback' => (bool) $s['tts_fallback'],
		);
		$json   = wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		?>
		<div id="gozkulak-prepare" class="gozkulak-prepare">
			<h2><?php esc_html_e( 'Hazır ses', 'gozkulak' ); ?></h2>
			<p><?php esc_html_e( 'Seçilen sayfaların sesi bu tarayıcıda bir kez üretilir ve sitenize yüklenir. Ziyaretçiler hazırlanmış sayfaları modeli indirmeden, kesilmeden dinler. Sayfa değişirse yalnızca değişen cümleler yeniden üretilir.', 'gozkulak' ); ?></p>
			<p class="description"><?php esc_html_e( 'Masaüstünde Chrome önerilir (WebGPU ile hızlı). Hazırlama sırasında bu sekme açık kalmalıdır. Bittikten sonra sitenin önbelleğini temizleyin.', 'gozkulak' ); ?></p>
			<?php if ( ! $s['prepared_audio'] ) : ?>
				<div class="notice notice-warning inline"><p><?php esc_html_e( '"Hazır ses" seçeneği kapalı: dosyalar hazırlanır ama ziyaretçilere çalınmaz.', 'gozkulak' ); ?></p></div>
			<?php endif; ?>
			<p class="gozkulak-prep-tools">
				<label>
					<?php esc_html_e( 'Tür:', 'gozkulak' ); ?>
					<select class="gozkulak-prep-type">
						<option value=""><?php esc_html_e( 'Hepsi', 'gozkulak' ); ?></option>
						<?php foreach ( $labels as $type => $label ) : ?>
							<option value="<?php echo esc_attr( $type ); ?>"><?php echo esc_html( $label ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<button type="button" class="button button-primary gozkulak-prep-run"><?php esc_html_e( 'Seçilenleri hazırla', 'gozkulak' ); ?></button>
				<button type="button" class="button gozkulak-prep-stop" hidden><?php esc_html_e( 'Durdur', 'gozkulak' ); ?></button>
				<button type="button" class="button gozkulak-prep-cleanup"><?php esc_html_e( 'Kullanılmayan dosyaları sil', 'gozkulak' ); ?></button>
				<button type="button" class="button-link button-link-delete gozkulak-prep-purge"><?php esc_html_e( 'Bütün hazır sesleri sil', 'gozkulak' ); ?></button>
			</p>
			<p class="gozkulak-prep-status" role="status" aria-live="polite"></p>
			<table class="widefat striped gozkulak-prep-table">
				<thead>
					<tr>
						<td class="check-column"><input type="checkbox" class="gozkulak-prep-all" aria-label="<?php esc_attr_e( 'Görünen sayfaların hepsini seç', 'gozkulak' ); ?>"></td>
						<th scope="col"><?php esc_html_e( 'Sayfa', 'gozkulak' ); ?></th>
						<th scope="col"><?php esc_html_e( 'Tür', 'gozkulak' ); ?></th>
						<th scope="col"><?php esc_html_e( 'Hazır ses', 'gozkulak' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $posts as $post ) : ?>
						<?php
						$title = get_the_title( $post );
						$title = '' === $title ? __( '(başlıksız)', 'gozkulak' ) : $title;
						$count = GozKulak_Audio::count( $post->ID );
						?>
						<tr data-id="<?php echo esc_attr( (string) $post->ID ); ?>" data-url="<?php echo esc_url( get_permalink( $post ) ); ?>" data-type="<?php echo esc_attr( $post->post_type ); ?>" data-title="<?php echo esc_attr( $title ); ?>" data-count="<?php echo esc_attr( (string) $count ); ?>">
							<th scope="row" class="check-column"><input type="checkbox" class="gozkulak-prep-pick" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: sayfa başlığı */ __( 'Seç: %s', 'gozkulak' ), $title ) ); ?>"></th>
							<td><a href="<?php echo esc_url( get_permalink( $post ) ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $title ); ?></a></td>
							<td><?php echo esc_html( isset( $labels[ $post->post_type ] ) ? $labels[ $post->post_type ] : $post->post_type ); ?></td>
							<td class="gozkulak-prep-state">
								<?php
								echo esc_html(
									$count
										/* translators: %d: dosya sayısı */
										? sprintf( _n( '%d dosya', '%d dosya', $count, 'gozkulak' ), $count )
										: '—'
								);
								?>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
			<?php if ( count( $posts ) >= self::PREPARE_MAX ) : ?>
				<p class="description">
					<?php
					/* translators: %d: en çok gösterilen sayfa sayısı */
					echo esc_html( sprintf( __( 'En son değişen %d sayfa gösteriliyor.', 'gozkulak' ), self::PREPARE_MAX ) );
					?>
				</p>
			<?php endif; ?>
			<?php
			if ( false !== $json ) {
				wp_print_inline_script_tag(
					$json,
					array(
						'type' => 'application/json',
						'id'   => 'gozkulak-prepare-config',
					)
				);
			}
			?>
		</div>
		<?php
	}
}

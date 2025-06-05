<?php
/**
 * Plugin Name: WP Auto Whats
 * Description: Send and receive WhatsApp messages via AUTWA.
 * Version: 1.1.1
 * Requires PHP: 7.0
 * Requires at least: 5.0
 * Tested up to: 6.8.1
 * Author: CurlWare
 * Author URI: https://causer.com.mx
 * Plugin URI: https://causer.com.mx
 * Contributor: Asraful
 * Contributor URI:Causer Consulting
 * Text Domain: wp-auto-whats
 * License: GPLv2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 */

defined('ABSPATH') || exit;

require_once __DIR__ . '/vendor/autoload.php';

use WpAutoWhats\Hooks\AjaxHandler;
use WpAutoWhats\API\Event;
use WpAutoWhats\Helpers\DB;
use WpAutoWhats\Admin\Menu;
use WpAutoWhats\Admin\Help_Tab;
use WpAutoWhats\Admin\Assets;
use WpAutoWhats\Helpers\Scheduler;
/**
 * The main plugin class
 */
final class WpAutoWhats {
    /**
     * Plugin version
     * 
     * @var string
     */
    const VERSION = '1.0.0';

    /**
     * Class construcotr
     */
    private function __construct() {

        $this->define_constants();
       
        register_activation_hook( __FILE__, [ $this, 'activate' ] );

        register_deactivation_hook( __FILE__, [ $this, 'deactivate' ] );

        add_action( 'plugins_loaded', [ $this, 'init_plugin' ] );
        add_action( 'rest_api_init', [ Event::class, 'register_routes' ] );
        
    }

    /**
     * Initializes a singleton instance
     * 
     *@return \WpAutoWhats
     */
    public static function init() {
        static $instance = false;

        if ( ! $instance ) {
            $instance = new self();
        }

        return $instance;
    }
    
        /**
     * Defines the required plugin constants
     * 
     * @return void
     */
    public function define_constants(){        
        define('AUTWA_PLUGIN_NAME', 'wp-auto-whats');
        define('AUTWA_PLUGIN_VERSION', self::VERSION);
        define('AUTWA_PLUGIN_FILE', __FILE__);
        define('AUTWA_PLUGIN_PATH', __DIR__);
        define('AUTWA_PLUGIN_BASENAME', plugin_basename(__FILE__));
        define('AUTWA_PLUGIN_URL', plugins_url('', AUTWA_PLUGIN_FILE));
        define('AUTWA_PLUGIN_ASSETS', AUTWA_PLUGIN_URL . '/assets');
        define('AUTWA_PLUGIN_ICON', AUTWA_PLUGIN_ASSETS . '/icon');

        $api_url = get_option('wpaw_api_url');
        $url_type = get_option('wpaw_url_type');
        $api_sessions = get_option('wpaw_api_sessions');
        $full_url = $url_type . '://' . $api_url;

        if($api_url !== '' && $url_type !== ''){

            define('AUTWA_API_URL', $full_url.'/api'); 
        }else{
             define('AUTWA_API_URL', 'http://localhost:3000/api'); 
        }
        if($api_url !== '' && $url_type !== ''){
            $socket_type = ($url_type === 'https')? 'wss://':'ws://';
            define('AUTWA_WS_URL', $socket_type . $api_url); 
        }else{
             define('AUTWA_WS_URL', 'ws://localhost:3000'); 
        }
        if($api_sessions !== ''){
             define('AUTWA_SESSION_ID', $api_sessions);
        }else{
              define('AUTWA_SESSION_ID', 'default');
        }
    }

    /**
     * Do stuff upon plugin activation
     *
     * @return void
     */
    public function activate(){
        new DB();
        new Scheduler();
        error_log('Plugin activated: ' . __FILE__);
    }

    /**
     * Do stuff upon plugin Deactivation
     *
     * @return void
     */
    public function deactivate(){
        error_log('Plugin deactivated: ' . __FILE__);
    }

    /**
     * Initialize the plugin
     *
     * @return void
     */
    public function init_plugin() {
        AjaxHandler::register();

        // Create database tables
        new Assets();
        new Menu();
        new Help_Tab();
        new Scheduler();


    }
}

/**
 * Initializes the main plugin
 *
 * @return \WpAutoWhats
 */
function wpautowhats() {
    return WpAutoWhats::init();
}

// kick-off the plugin
wpautowhats();
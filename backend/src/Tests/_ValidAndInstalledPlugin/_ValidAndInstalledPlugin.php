<?php

namespace RadCms\Tests\_ValidAndInstalledPlugin;

use RadCms\Plugin\PluginInterface;

class _ValidAndInstalledPlugin implements PluginInterface {
    public static $instantiated = null;
    public static $initialized = null;
    public static $installed = null;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init($ctx) {
        self::$initialized = true;
    }
    public function install($ctx) {
        //
    }
    public function uninstall($ctx) {
        self::$installed = false;
    }
}

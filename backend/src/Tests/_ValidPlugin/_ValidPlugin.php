<?php

namespace RadCms\Tests\_ValidPlugin;

use RadCms\Plugin\PluginInterface;

class _ValidPlugin implements PluginInterface {
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
        self::$installed = true;
    }
    public function uninstall($ctx) {
        //
    }
}

<?php

namespace RadCms\Tests\_ValidPlugin;

use RadCms\Plugin\PluginInterface;

class _ValidPlugin implements PluginInterface {
    public static $instantiated = false;
    public static $initialized = false;
    public static $installed = false;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init($ctx) {
        self::$initialized = true;
    }
    public function install($ctx) {
        self::$installed = true;
    }
}

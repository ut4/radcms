<?php

namespace RadCms\Tests\_ValidAndInstalledPlugin;

use RadCms\Plugin\PluginInterface;

class _ValidAndInstalledPlugin implements PluginInterface {
    public static $instantiated = false;
    public static $initialized = false;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init($ctx) {
        self::$initialized = true;
    }
}

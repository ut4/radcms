<?php

namespace RadCms\Tests\_ValidPlugin;

use RadCms\Plugins\PluginInterface;

class _ValidPlugin implements PluginInterface {
    public static $initialized = false;
    public function init($ctx) {
        self::$initialized = true;
    }
}

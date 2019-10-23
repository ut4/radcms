<?php

namespace RadCms\Tests\_ValidAndInstalledPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\API;
use RadCms\ContentType\ContentTypeMigrator;

class _ValidAndInstalledPlugin implements PluginInterface {
    public static $instantiated = null;
    public static $initialized = null;
    public static $installed = null;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init(API $api) {
        self::$initialized = true;
    }
    public function install(ContentTypeMigrator $migrator) {
        //
    }
    public function uninstall(ContentTypeMigrator $migrator) {
        self::$installed = false;
    }
}

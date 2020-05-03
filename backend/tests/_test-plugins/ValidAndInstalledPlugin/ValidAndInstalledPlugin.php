<?php

namespace RadPlugins\ValidAndInstalledPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\PluginAPI;
use RadCms\ContentType\ContentTypeMigrator;

class ValidAndInstalledPlugin implements PluginInterface {
    public static $instantiated = null;
    public static $initialized = null;
    public static $installed = null;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init(PluginAPI $api) {
        self::$initialized = true;
    }
    public function install(ContentTypeMigrator $migrator) {
        //
    }
    public function uninstall(ContentTypeMigrator $migrator) {
        self::$installed = false;
    }
}

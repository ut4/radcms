<?php

namespace RadPlugins\ValidPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\PluginAPI;
use RadCms\ContentType\ContentTypeMigrator;

class ValidPlugin implements PluginInterface {
    public static $instantiated = null;
    public static $initialized = null;
    public static $installed = null;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init(PluginAPI $api): void {
        self::$initialized = true;
    }
    public function install(ContentTypeMigrator $migrator): void {
        self::$installed = true;
    }
    public function uninstall(ContentTypeMigrator $migrator): void {
        //
    }
}

<?php

namespace MySite\Plugins\ValidPlugin;

use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\API;
use RadCms\ContentType\ContentTypeMigrator;

class ValidPlugin implements PluginInterface {
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
        self::$installed = true;
    }
    public function uninstall(ContentTypeMigrator $migrator) {
        //
    }
}

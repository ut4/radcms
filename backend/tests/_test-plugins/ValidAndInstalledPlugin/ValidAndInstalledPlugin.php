<?php

declare(strict_types=1);

namespace RadPlugins\ValidAndInstalledPlugin;

use RadCms\Plugin\{MigrationAPI, PluginAPI, PluginInterface};

class ValidAndInstalledPlugin implements PluginInterface {
    public static $instantiated = null;
    public static $initialized = null;
    public static $installed = null;
    public function __construct() {
        self::$instantiated = true;
    }
    public function init(PluginAPI $api): void {
        self::$initialized = true;
    }
    public function install(MigrationAPI $api, array $initialContent): void {
        //
    }
    public function uninstall(MigrationAPI $api): void {
        self::$installed = false;
    }
    public function pack(\RadCms\Content\DAO $dao, \RadCms\Entities\PluginPackData $to): void {
        //
    }
}

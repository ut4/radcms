<?php

declare(strict_types=1);

namespace RadPlugins\ValidPlugin;

use RadCms\Plugin\{MigrationAPI, PluginAPI, PluginInterface};

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
    public function install(MigrationAPI $api, array $initialContent): void {
        self::$installed = true;
    }
    public function uninstall(MigrationAPI $api): void {
        //
    }
    public function pack(\RadCms\Content\DAO $dao, \RadCms\Entities\PluginPackData $to): void {
        //
    }
}

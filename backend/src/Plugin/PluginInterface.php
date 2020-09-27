<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use RadCms\Content\DAO;
use RadCms\Entities\PluginPackData;

/**
 * Rajapinta, jonka lisäosien "main"-luokkien (RAD_WORKSPACE_PATH .
 * 'plugins/PluginName/PluginName.php') tulee implementoida.
 */
interface PluginInterface {
    /**
     * @param \RadCms\Plugin\PluginAPI $api
     */
    public function init(PluginAPI $api): void;
    /**
     * @param \RadCms\Plugin\MigrationAPI $api
     * @param array[mixed[]] $initialContent Sama kuin PluginPackData->initialContent
     */
    public function install(MigrationAPI $api, array $initialContent): void;
    /**
     * @param \RadCms\Plugin\MigrationAPI $api
     */
    public function uninstall(MigrationAPI $api): void;
    /**
     * @param \RadCms\Content\DAO $dao
     * @param \RadCms\Entities\PluginPackData $to
     */
    public function pack(DAO $dao, PluginPackData $to): void;
}

<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Entities\PluginPackData;

/**
 * Rajapinta, jonka lisäosien "main"-luokkien (RAD_PUBLIC_PATH .
 * 'plugins/PluginName/PluginName.php') tulee implementoida.
 */
interface PluginInterface {
    /**
     * @param \RadCms\Plugin\PluginAPI $api
     */
    public function init(PluginAPI $api): void;
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @param array[mixed[]] $initialContent Sama kuin PluginPackData->initialContent
     */
    public function install(ContentTypeMigrator $migrator,
                            array $initialContent): void;
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function uninstall(ContentTypeMigrator $migrator): void;
    /**
     * @param \RadCms\Content\DAO $dao
     * @param \RadCms\Entities\PluginPackData $to
     */
    public function pack(DAO $dao, PluginPackData $to): void;
}

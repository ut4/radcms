<?php

namespace RadCms\Plugin;

use RadCms\ContentType\ContentTypeMigrator;

/**
 * Rajapinta, jonka lisäosien "main"-luokkien (RAD_PUBLIC_PATH .
 * 'plugins/PluginName/PluginName.php') tulee implementoida.
 */
interface PluginInterface {
    /**
     * @param \RadCms\Plugin\PluginAPI $api
     */
    public function init(PluginAPI $api);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function install(ContentTypeMigrator $migrator);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function uninstall(ContentTypeMigrator $migrator);
}

<?php

namespace RadCms\Plugin;

use RadCms\ContentType\ContentTypeMigrator;

/**
 * Rajapinta, jonka lisäosien "main"-luokkien (RAD_SITE_PATH .
 * 'plugins/PluginName/PluginName.php') tulee implementoida.
 */
interface PluginInterface {
    /**
     * @param \RadCms\Plugin\API $api
     */
    public function init(API $api);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function install(ContentTypeMigrator $migrator);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function uninstall(ContentTypeMigrator $migrator);
}

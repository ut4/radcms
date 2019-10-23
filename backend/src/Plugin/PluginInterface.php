<?php

namespace RadCms\Plugin;

use RadCms\ContentType\ContentTypeMigrator;

interface PluginInterface {
    /**
     * @param \RadCms\Plugin\API $api
     * @return string|void|null 'Some error message', or null|void on success
     */
    public function init(API $api);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @return string|void|null 'Some error message', or null|void on success
     */
    public function install(ContentTypeMigrator $migrator);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     * @return string|void|null 'Some error message', or null|void on success
     */
    public function uninstall(ContentTypeMigrator $migrator);
}

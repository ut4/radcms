<?php

namespace RadCms\Plugin;

interface PluginInterface {
    /**
     * @param \RadCms\Plugin\API $api
     */
    public function init(API $api);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     * @return string|void|null 'Some error message', or null|void on success
     */
    public function install($contentTypeMigrator);
    /**
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     * @return string|void|null 'Some error message', or null|void on success
     */
    public function uninstall($contentTypeMigrator);
}

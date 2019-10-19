<?php

namespace RadCms\Plugin;

interface PluginInterface {
    /**
     * @param object $ctx
     */
    public function init($ctx);
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

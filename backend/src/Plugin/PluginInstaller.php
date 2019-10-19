<?php

namespace RadCms\Plugin;

use RadCms\Common\Db;
use RadCms\ContentType\ContentTypeMigrator;

class PluginInstaller {
    private $db;
    private $contentTypeMigrator;
    /**
     * @param \RadCms\Common\Db $db
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     */
    public function __construct(Db $db, ContentTypeMigrator $contentTypeMigrator) {
        $this->db = $db;
        $this->contentTypeMigrator = $contentTypeMigrator;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return string|null 'Some error message', or null on success
     */
    public function install(Plugin $plugin) {
        if (!$plugin->impl) {
            $plugin->instantiate();
        }
        $errorMessage = $plugin->impl->install($this->contentTypeMigrator);
        if (!is_string($errorMessage) || !$errorMessage) {
            return $this->db->exec('update ${p}websiteState' .
                                   ' set `installedPlugins` = JSON_MERGE_PATCH(`installedPlugins`, ?)',
                                   ['["' . $plugin->name . '"]']) === 1
                ? null
                : 'Failed to update websiteState.`installedPlugins`';
        }
        return $errorMessage;
    }
}

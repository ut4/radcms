<?php

namespace RadCms\Plugin;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeMigrator;

class PluginInstaller {
    private $db;
    private $contentTypeMigrator;
    /**
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     */
    public function __construct(Db $db, ContentTypeMigrator $contentTypeMigrator) {
        $this->db = $db;
        $this->contentTypeMigrator = $contentTypeMigrator;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return null|string null on success or 'Some error message'
     */
    public function install(Plugin $plugin) {
        if ($plugin->isInstalled) {
            return 'Plugin is already installed.';
        }
        if (!$plugin->impl) {
            $plugin->instantiate();
        }
        $errorMessage = $plugin->impl->install($this->contentTypeMigrator);
        if (!is_string($errorMessage) || !$errorMessage) {
            return $this->db->exec('UPDATE ${p}websiteState SET `installedPlugins`' .
                                   ' = JSON_SET(`installedPlugins`, ?, 1)',
                                   ['$."' . $plugin->name . '"']) === 1
                ? null
                : 'Failed to update websiteState.`installedPlugins`';
        }
        return $errorMessage;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return null|string null on success or 'Some error message'
     */
    public function uninstall(Plugin $plugin) {
        if (!$plugin->isInstalled) {
            return 'Plugin is already uninstalled.';
        }
        if (!$plugin->impl) {
            $plugin->instantiate();
        }
        $errorMessage = $plugin->impl->uninstall($this->contentTypeMigrator);
        if (!is_string($errorMessage) || !$errorMessage) {
            return $this->db->exec('UPDATE ${p}websiteState SET `installedPlugins`' .
                                   ' = JSON_REMOVE(`installedPlugins`, ?)',
                                   ['$."' . $plugin->name . '"']) === 1
                ? null
                : 'Failed to update websiteState.`installedPlugins`';
        }
        return $errorMessage;
    }
}

<?php

namespace RadCms\Plugin;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Common\RadException;

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
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function install(Plugin $plugin) {
        if ($plugin->isInstalled) {
            return 'Plugin is already installed.';
        }
        if (!$plugin->impl) {
            $plugin->instantiate();
        }
        $this->contentTypeMigrator->setOrigin($plugin);
        // @allow \RadCms\Common\RadException
        $plugin->impl->install($this->contentTypeMigrator);
        // @allow \RadCms\Common\RadException
        return $this->updateInstalledPlugins('UPDATE ${p}websiteState SET `installedPlugins`' .
                                             ' = JSON_SET(`installedPlugins`, ?, 1)',
                                             $plugin->name);
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function uninstall(Plugin $plugin) {
        if (!$plugin->isInstalled) {
            return 'Plugin is already uninstalled.';
        }
        if (!$plugin->impl) {
            $plugin->instantiate();
        }
        // @allow \RadCms\Common\RadException
        $plugin->impl->uninstall($this->contentTypeMigrator);
        // @allow \RadCms\Common\RadException
        return $this->updateInstalledPlugins('UPDATE ${p}websiteState SET `installedPlugins`' .
                                             ' = JSON_REMOVE(`installedPlugins`, ?)',
                                             $plugin->name);
    }
    /**
     * @param string $sql
     * @param string $pluginName
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function updateInstalledPlugins($sql, $pluginName) {
        try {
            if ($this->db->exec($sql, ['$."' . $pluginName . '"']) === 1) {
                return true;
            }
            throw new RadException('Failed to update websiteState.`installedPlugins`',
                                   RadException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
    }
}

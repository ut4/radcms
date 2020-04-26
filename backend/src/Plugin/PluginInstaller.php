<?php

namespace RadCms\Plugin;

use Pike\Db;
use RadCms\ContentType\ContentTypeMigrator;
use Pike\PikeException;

class PluginInstaller {
    private $db;
    private $contentTypeMigrator;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     */
    public function __construct(Db $db, ContentTypeMigrator $contentTypeMigrator) {
        $this->db = $db;
        $this->contentTypeMigrator = $contentTypeMigrator;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return bool
     * @throws \Pike\PikeException
     */
    public function install(Plugin $plugin) {
        if ($plugin->isInstalled) {
            return 'Plugin is already installed.';
        }
        // @allow \Pike\PikeException
        $instance = $plugin->instantiate();
        $this->contentTypeMigrator->setOrigin($plugin);
        // @allow \Pike\PikeException
        $instance->install($this->contentTypeMigrator);
        // @allow \Pike\PikeException
        return $this->updateInstalledPlugins('UPDATE ${p}cmsState SET `installedPlugins`' .
                                             ' = JSON_SET(`installedPlugins`, ?, 1)',
                                             $plugin->name);
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @return bool
     * @throws \Pike\PikeException
     */
    public function uninstall(Plugin $plugin) {
        if (!$plugin->isInstalled) {
            return 'Plugin is already uninstalled.';
        }
        // @allow \Pike\PikeException
        $instance = $plugin->instantiate();
        // @allow \Pike\PikeException
        $instance->uninstall($this->contentTypeMigrator);
        // @allow \Pike\PikeException
        return $this->updateInstalledPlugins('UPDATE ${p}cmsState SET `installedPlugins`' .
                                             ' = JSON_REMOVE(`installedPlugins`, ?)',
                                             $plugin->name);
    }
    /**
     * @param string $sql
     * @param string $pluginName
     * @return bool
     * @throws \Pike\PikeException
     */
    private function updateInstalledPlugins($sql, $pluginName) {
        try {
            if ($this->db->exec($sql, ['$."' . $pluginName . '"']) === 1) {
                return true;
            }
            throw new PikeException('Failed to update cmsState.`installedPlugins`',
                                    PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
    }
}

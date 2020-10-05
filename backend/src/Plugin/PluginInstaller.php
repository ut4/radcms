<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use Pike\{Db, PikeException};
use Pike\Interfaces\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;

final class PluginInstaller {
    /** @var \Pike\Db */
    private $db;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var \RadCms\ContentType\ContentTypeMigrator */
    private $contentTypeMigrator;
    /**
     * @param \Pike\Db $db
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param \RadCms\ContentType\ContentTypeMigrator $contentTypeMigrator
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                ContentTypeMigrator $contentTypeMigrator) {
        $this->db = $db;
        $this->fs = $fs;
        $this->contentTypeMigrator = $contentTypeMigrator;
    }
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @param array[mixed[]] $initialContent = [] [['ContentTypeName', [(object)['key' => 'value']...]]...]
     * @return bool
     * @throws \Pike\PikeException
     */
    public function install(Plugin $plugin, array $initialContent = []): bool {
        if ($plugin->isInstalled) {
            return 'Plugin is already installed.';
        }
        // @allow \Pike\PikeException
        $instance = $plugin->instantiate();
        // @allow \Pike\PikeException
        $instance->install(new MigrationAPI($plugin,
                                           $this->contentTypeMigrator,
                                           $this->fs),
                           $initialContent);
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
    public function uninstall(Plugin $plugin): bool {
        if (!$plugin->isInstalled) {
            return 'Plugin is already uninstalled.';
        }
        // @allow \Pike\PikeException
        $instance = $plugin->instantiate();
        // @allow \Pike\PikeException
        $instance->uninstall(new MigrationAPI($plugin,
                                              $this->contentTypeMigrator,
                                              $this->fs));
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
    private function updateInstalledPlugins(string $sql,
                                            string $pluginName): bool {
        // @allow \Pike\PikeException
        if ($this->db->exec($sql, ['$."' . $pluginName . '"']) === 1) {
            return true;
        }
        throw new PikeException('Failed to update cmsState.`installedPlugins`',
                                PikeException::INEFFECTUAL_DB_OP);
    }
}

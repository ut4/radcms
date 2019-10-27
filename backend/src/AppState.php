<?php

namespace RadCms;

use AltoRouter;
use RadCms\Plugin\API;
use RadCms\Framework\Db;
use RadCms\Framework\FileSystemInterface;
use RadCms\Plugin\PluginCollection;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Plugin\PluginInterface;
use RadCms\Website\SiteConfigDiffer;
use RadCms\ContentType\ContentTypeSyncer;

class AppState {
    public $plugins;
    public $contentTypes;
    public $pluginJsFiles;
    public $contentTypesLastUpdated;
    private $db;
    private $fs;
    /**
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\Framework\FileSystemInterface $db
     */
    public function __construct(Db $db, FileSystemInterface $fs) {
        $this->plugins = new PluginCollection();
        $this->contentTypes = new ContentTypeCollection();
        $this->pluginJsFiles = [];
        $this->db = $db;
        $this->fs = $fs;
    }
    /**
     * @param string $pluginsDir 'Plugins', 'MyDir'
     * @param AltoRouter $router
     */
    public function selfLoad($pluginsDir, AltoRouter $router) {
        $installedPluginNames = $this->fetchState();
        $pluginAPI = new API($router, $this->pluginJsFiles);
        $this->scanAndInitPlugins($pluginsDir, $pluginAPI, $installedPluginNames);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $newDefsFromFile
     * @param string $origin 'site.ini' | 'SomePlugin.ini'
     */
    public function diffAndSaveChangesToDb(ContentTypeCollection $newDefsFromFile,
                                           $origin) {
        $currentDefsFromDb = $this->contentTypes->filter($origin, 'origin');
        [$ctypesDiff, $fieldsDiff] = (new SiteConfigDiffer())
            ->run($newDefsFromFile, $currentDefsFromDb);
        return (new ContentTypeSyncer($this->db))->sync($ctypesDiff, $fieldsDiff);
    }
    /**
     * .
     */
    private function fetchState() {
        if (!($row = $this->db->fetchOne(
            'select `installedContentTypes`, `installedContentTypesLastUpdated`,' .
            ' `installedPlugins` from ${p}websiteState'
        ))) {
            throw new \RuntimeException('Failed to fetch websiteState');
        }
        //
        if (($installedPluginNames = json_decode($row['installedPlugins'], true)) === null)
            throw new \RuntimeException('Failed to parse installedPlugins');
        if (!is_array($installedPluginNames)) $installedPluginNames = [];
        //
        if (($ctypesData = json_decode($row['installedContentTypes'], true)) === null)
            throw new \RuntimeException('Failed to parse installedContentTypes');
        foreach ($ctypesData as $ctypeName => $remainingArgs)
            $this->contentTypes->add($ctypeName, ...$remainingArgs);
        //
        $this->contentTypesLastUpdated = $row['installedContentTypesLastUpdated'] ?? 0;
        //
        return $installedPluginNames;
    }
    /**
     * @param string $pluginDir
     * @param \RadCms\Plugin\PluginAPI $pluginAPI
     * @param array $installedPluginNames Array<string>
     */
    private function scanAndInitPlugins($pluginsDir,
                                        API $pluginAPI,
                                        $installedPluginNames) {
        $this->scanPluginsFromDisk($pluginsDir);
        foreach ($this->plugins->toArray() as &$plugin) {
            if (($plugin->isInstalled = array_key_exists($plugin->name,
                                                         $installedPluginNames))) {
                $plugin->instantiate();
                $plugin->impl->init($pluginAPI);
            }
        }
    }
    /**
     * @param string $pluginDir
     */
    private function scanPluginsFromDisk($pluginsDir) {
        $paths = $this->fs->readDir(RAD_BASE_PATH . 'src/' . $pluginsDir, '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "RadCms\\{$pluginsDir}\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new \RuntimeException("Main plugin class \"{$clsPath}\" missing");
            if (!array_key_exists(PluginInterface::class, class_implements($clsPath, false)))
                throw new \RuntimeException("A plugin (\"{$clsPath}\") must implement RadCms\Plugin\PluginInterface");
            $this->plugins->add($clsName, $clsPath);
        }
    }
}

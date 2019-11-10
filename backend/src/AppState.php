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
use RadCms\Common\RadException;

class AppState {
    public $plugins;
    public $contentTypes;
    public $pluginJsFiles;
    public $pluginFrontendAdminPanelInfos;
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
        $this->pluginFrontendAdminPanelInfos = [];
        $this->db = $db;
        $this->fs = $fs;
    }
    /**
     * @param AltoRouter $router
     * @throws \RadCms\Common\RadException
     */
    public function selfLoad(AltoRouter $router) {
        // @allow \RadCms\Common\RadException
        $installedPluginNames = $this->fetchState();
        $pluginAPI = new API($router,
                             function ($f) { $this->pluginJsFiles[] = $f; },
                             function ($p) { $this->pluginFrontendAdminPanelInfos[] = $p; });
        // @allow \RadCms\Common\RadException
        $this->scanAndInitPlugins($pluginAPI, $installedPluginNames);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $newDefsFromFile
     * @param string $origin 'site.ini' | 'SomePlugin.ini'
     * @throws \RadCms\Common\RadException
     * @return bool
     */
    public function diffAndSaveChangesToDb(ContentTypeCollection $newDefsFromFile,
                                           $origin) {
        $currentDefsFromDb = $this->contentTypes->filter($origin, 'origin');
        [$ctypesDiff, $fieldsDiff] = (new SiteConfigDiffer())
            ->run($newDefsFromFile, $currentDefsFromDb);
        // @allow \RadCms\Common\RadException
        return (new ContentTypeSyncer($this->db))->sync($ctypesDiff, $fieldsDiff);
    }
    /**
     * @throws \RadCms\Common\RadException
     */
    private function fetchState() {
        try {
            if (!($row = $this->db->fetchOne(
                'select `installedContentTypes`, `installedContentTypesLastUpdated`,' .
                ' `installedPlugins` from ${p}websiteState'
            ))) {
                throw new RadException('Failed to fetch websiteState', RadException::INEFFECTUAL_DB_OP);
            }
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
        //
        if (($installedPluginNames = json_decode($row['installedPlugins'], true)) === null)
            throw new RadException('Failed to parse installedPlugins',
                                   RadException::BAD_INPUT);
        if (!is_array($installedPluginNames)) $installedPluginNames = [];
        //
        if (($ctypesData = json_decode($row['installedContentTypes'], true)) === null)
            throw new RadException('Failed to parse installedContentTypes',
                                   RadException::BAD_INPUT);
        foreach ($ctypesData as $ctypeName => $remainingArgs)
            $this->contentTypes->add($ctypeName, ...$remainingArgs);
        //
        $this->contentTypesLastUpdated = $row['installedContentTypesLastUpdated'] ?? 0;
        //
        return $installedPluginNames;
    }
    /**
     * @param \RadCms\Plugin\PluginAPI $pluginAPI
     * @param string[] $installedPluginNames
     * @throws \RadCms\Common\RadException
     */
    private function scanAndInitPlugins(API $pluginAPI, $installedPluginNames) {
        // @allow \RadCms\Common\RadException
        $this->scanPluginsFromDisk();
        foreach ($this->plugins->toArray() as &$plugin) {
            if (($plugin->isInstalled = array_key_exists($plugin->name,
                                                         $installedPluginNames))) {
                $plugin->instantiate();
                $plugin->impl->init($pluginAPI);
            }
        }
    }
    /**
     * @throws \RadCms\Common\RadException
     */
    private function scanPluginsFromDisk() {
        $paths = $this->fs->readDir(RAD_SITE_PATH . 'Plugins', '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "MySite\\Plugins\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new RadException("Main plugin class \"{$clsPath}\" missing",
                                       RadException::BAD_INPUT);
            if (!array_key_exists(PluginInterface::class, class_implements($clsPath, false)))
                throw new RadException("A plugin (\"{$clsPath}\") must implement RadCms\Plugin\PluginInterface",
                                       RadException::BAD_INPUT);
            $this->plugins->add($clsName, $clsPath);
        }
    }
}

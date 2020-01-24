<?php

namespace RadCms;

use AltoRouter;
use RadCms\Plugin\API;
use Pike\Db;
use Pike\FileSystemInterface;
use RadCms\Plugin\PluginCollection;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Plugin\PluginInterface;
use RadCms\Website\SiteConfigDiffer;
use RadCms\ContentType\ContentTypeSyncer;
use Pike\PikeException;

class AppState {
    public $plugins;
    public $contentTypes;
    public $websiteState;
    public $pluginJsFiles;
    public $pluginFrontendAdminPanelInfos;
    public $contentTypesLastUpdated;
    private $db;
    private $fs;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $db
     */
    public function __construct(Db $db, FileSystemInterface $fs) {
        $this->plugins = new PluginCollection();
        $this->websiteState = (object)['name' => null, 'lang' => null];
        $this->pluginJsFiles = [];
        $this->pluginFrontendAdminPanelInfos = [];
        $this->db = $db;
        $this->fs = $fs;
    }
    /**
     * @param AltoRouter $router
     * @throws \Pike\PikeException
     */
    public function selfLoad(AltoRouter $router) {
        // @allow \Pike\PikeException
        $state = $this->fetchNormalizedState();
        $this->contentTypes = ContentTypeCollection::fromCompactForm($state->compactContentTypes);
        $this->contentTypesLastUpdated = $state->contentTypesLastUpdated;
        $this->websiteState->name = $state->websiteName;
        $this->websiteState->lang = $state->lang;
        $pluginAPI = new API($router,
                             function ($f) { $this->pluginJsFiles[] = $f; },
                             function ($p) { $this->pluginFrontendAdminPanelInfos[] = $p; });
        // @allow \Pike\PikeException
        $this->scanAndInitPlugins($pluginAPI, $state->installedPluginNames);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $newDefsFromFile
     * @param string $origin 'site.json' | 'SomePlugin.json'
     * @throws \Pike\PikeException
     * @return bool
     */
    public function diffAndSaveChangesToDb(ContentTypeCollection $newDefsFromFile,
                                           $origin) {
        $currentDefsFromDb = $this->contentTypes->filter($origin, 'origin');
        [$ctypesDiff, $fieldsDiff] = (new SiteConfigDiffer())
            ->run($newDefsFromFile, $currentDefsFromDb);
        // @allow \Pike\PikeException
        return (new ContentTypeSyncer($this->db))->sync($ctypesDiff, $fieldsDiff);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function fetchNormalizedState() {
        $out = (object) ['compactContentTypes' => null, 'installedPluginNames' => null,
            'lang' => null, 'websiteName' => null, 'contentTypesLastUpdated' => null];
        try {
            if (!($row = $this->db->fetchOne(
                'select `name`, `installedContentTypes`' .
                ', `installedContentTypesLastUpdated`' .
                ', `installedPlugins`, `lang` from ${p}websiteState'
            ))) {
                throw new PikeException('Failed to fetch websiteState', PikeException::INEFFECTUAL_DB_OP);
            }
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        //
        if (($out->installedPluginNames = json_decode($row['installedPlugins'],
                                                      true)) === null)
            throw new PikeException('Failed to parse installedPlugins',
                                    PikeException::BAD_INPUT);
        if (!is_array($out->installedPluginNames)) $out->installedPluginNames = [];
        //
        if (($out->compactContentTypes = json_decode($row['installedContentTypes'],
                                                     true)) === null)
            throw new PikeException('Failed to parse installedContentTypes',
                                    PikeException::BAD_INPUT);
        //
        $out->websiteName = $row['name'];
        $out->lang = $row['lang'] ?? 'fi_FI';
        $out->contentTypesLastUpdated = intval($row['installedContentTypesLastUpdated'] ?? 0);
        return $out;
    }
    /**
     * @param \RadCms\Plugin\PluginAPI $pluginAPI
     * @param string[] $installedPluginNames
     * @throws \Pike\PikeException
     */
    private function scanAndInitPlugins(API $pluginAPI, $installedPluginNames) {
        // @allow \Pike\PikeException
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
     * @throws \Pike\PikeException
     */
    private function scanPluginsFromDisk() {
        $paths = $this->fs->readDir(RAD_SITE_PATH . 'plugins', '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "RadPlugins\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new PikeException("Main plugin class \"{$clsPath}\" missing",
                                        PikeException::BAD_INPUT);
            if (!array_key_exists(PluginInterface::class, class_implements($clsPath, false)))
                throw new PikeException("A plugin (\"{$clsPath}\") must implement RadCms\Plugin\PluginInterface",
                                        PikeException::BAD_INPUT);
            $this->plugins->add($clsName, $clsPath);
        }
    }
}

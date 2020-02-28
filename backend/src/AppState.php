<?php

namespace RadCms;

use Pike\Db;
use Pike\Router;
use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\Plugin\API;
use RadCms\Plugin\PluginCollection;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Plugin\PluginInterface;
use RadCms\Auth\ACL;

class AppState {
    public $acl;
    public $plugins;
    public $contentTypes;
    public $siteInfo;
    public $apiConfigs;
    private $db;
    private $fs;
    private $contentTypesLastUpdated;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $db
     * @param \RadCms\Auth\ACL $acl
     */
    public function __construct(Db $db, FileSystemInterface $fs, ACL $acl) {
        $this->acl = $acl;
        $this->plugins = new PluginCollection();
        $this->siteInfo = (object)['name' => null, 'lang' => null];
        $this->fs = $fs;
        $this->apiConfigs = new APIConfigsStorage($this->fs);
        $this->db = $db;
    }
    /**
     * @param \Pike\Router $router
     * @throws \Pike\PikeException
     */
    public function selfLoad(Router $router) {
        // @allow \Pike\PikeException
        $state = $this->fetchNormalizedState();
        $this->contentTypes = ContentTypeCollection::fromCompactForm($state->compactContentTypes);
        $this->acl->setRules($state->compactAclRules);
        $this->contentTypesLastUpdated = $state->contentTypesLastUpdated;
        $this->siteInfo->name = $state->websiteName;
        $this->siteInfo->lang = $state->lang;
        $pluginAPI = new API(new BaseAPI($this->apiConfigs),
                             $router,
                             $this->apiConfigs);
        // @allow \Pike\PikeException
        $this->scanAndInitPlugins($pluginAPI, $state->installedPluginNames);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function fetchNormalizedState() {
        $out = new \stdClass;
        try {
            if (!($row = $this->db->fetchOne(
                'select `name`, `installedContentTypes`' .
                ', `installedContentTypesLastUpdated`' .
                ', `installedPlugins`, `aclRules`, `lang` from ${p}websiteState'
            ))) throw new PikeException('Failed to fetch websiteState',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        //
        $out->websiteName = $row['name'];
        $out->lang = $row['lang'] ?? 'fi_FI';
        $out->contentTypesLastUpdated = intval($row['installedContentTypesLastUpdated'] ?? 0);
        $out->installedPluginNames = self::parseJsonOrThrow($row, 'installedPlugins');
        $out->compactContentTypes = self::parseJsonOrThrow($row, 'installedContentTypes');
        $out->compactAclRules = self::parseJsonOrThrow($row, 'aclRules');
        //
        return $out;
    }
    /**
     * @param \RadCms\Plugin\PluginAPI $pluginAPI
     * @param \stdClass $installedPluginNames {"name": 1 ...}
     * @throws \Pike\PikeException
     */
    private function scanAndInitPlugins(API $pluginAPI, $installedPluginNames) {
        // @allow \Pike\PikeException
        $this->scanPluginsFromDisk();
        foreach ($this->plugins->toArray() as $plugin) {
            if (($plugin->isInstalled = property_exists($installedPluginNames,
                                                        $plugin->name))) {
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
    /**
     * @throws \Pike\PikeException
     */
    private static function parseJsonOrThrow($row, $columnName) {
        $out = json_decode($row[$columnName]);
        if ($out !== null) return $out;
        throw new PikeException("Failed to parse {$columnName}",
                                PikeException::BAD_INPUT);
    }
}

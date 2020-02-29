<?php

namespace RadCms;

use Pike\Db;
use Pike\FileSystem;
use Pike\Router;
use Pike\PikeException;
use RadCms\Plugin\API;
use RadCms\Plugin\PluginInterface;
use RadCms\Plugin\Plugin;

/**
 * Rutiinit jotka ajetaan jokaisen App->handleRequest()-kutsun yhteydessä.
 */
class CmsStateLoader {
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystem $fs
     * @param \Pike\Router $router
     */
    public static function getAndInitStateFromDb(Db $db,
                                                 FileSystem $fs,
                                                 Router $router) {
        $raw = self::getStateFromDb($db);
        $out = new CmsState($raw, new APIConfigsStorage($fs));
        //
        $plugins = $out->getPlugins();
        self::scanPluginsFromDisk($plugins, $fs);
        $pluginAPI = new API(new BaseAPI($out->getApiConfigs()),
                             $router,
                             $out->getApiConfigs());
        foreach ($plugins as $plugin) {
            if (($plugin->isInstalled = property_exists($raw->installedPluginNames,
                                                        $plugin->name))) {
                $plugin->instantiate();
                $plugin->impl->init($pluginAPI);
            }
        }
        return $out;
    }
    /**
     * @throws \Pike\PikeException
     */
    private static function getStateFromDb($db) {
        try {
            if (!($row = $db->fetchOne(
                'select `name`, `installedContentTypes`' .
                ', `installedContentTypesLastUpdated`' .
                ', `installedPlugins`, `aclRules`, `lang` from ${p}cmsState'
            ))) throw new PikeException('Failed to fetch cmsState',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        //
        return (object) [
            'siteInfo' => (object) [
                'name' => $row['name'],
                'lang' => $row['lang'] ?? 'fi_FI'
            ],
            'contentTypesLastUpdated' => intval($row['installedContentTypesLastUpdated'] ?? 0),
            'installedPluginNames' => self::parseJsonOrThrow($row, 'installedPlugins'),
            'compactContentTypes' => self::parseJsonOrThrow($row, 'installedContentTypes'),
            'compactAclRules' => self::parseJsonOrThrow($row, 'aclRules'),
        ];
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
    /**
     * @throws \Pike\PikeException
     */
    private static function scanPluginsFromDisk($to, $fs) {
        // @allow \Pike\PikeException
        $paths = $fs->readDir(RAD_SITE_PATH . 'plugins', '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "RadPlugins\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new PikeException("Main plugin class \"{$clsPath}\" missing",
                                        PikeException::BAD_INPUT);
            if (!array_key_exists(PluginInterface::class, class_implements($clsPath, false)))
                throw new PikeException("A plugin (\"{$clsPath}\") must implement RadCms\Plugin\PluginInterface",
                                        PikeException::BAD_INPUT);
            $to->append(new Plugin($clsName, $clsPath));
        }
    }
}

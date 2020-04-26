<?php

namespace RadCms;

use Pike\Db;
use Pike\FileSystem;
use Pike\Router;
use Pike\PikeException;
use RadCms\Plugin\PluginAPI;
use RadCms\Plugin\Plugin;

/**
 * Rutiinit jotka ajetaan jokaisen App->handleRequest()-kutsun yhteydessä.
 */
class CmsStateLoader {
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystem $fs
     * @param \Pike\Router $router
     * @return \RadCms\CmsState
     */
    public static function getAndInitStateFromDb(Db $db,
                                                 FileSystem $fs,
                                                 Router $router) {
        $raw = self::getStateFromDb($db);
        $out = new CmsState($raw, new APIConfigsStorage($fs));
        //
        $plugins = $out->getPlugins();
        self::scanPluginsFromDisk($plugins, $fs);
        $pluginAPI = new PluginAPI($out->getApiConfigs(), $router);
        foreach ($plugins as $plugin) {
            if (($plugin->isInstalled = property_exists($raw->installedPluginNames,
                                                        $plugin->name))) {
                // @allow \Pike\PikeException
                $instance = $plugin->instantiate();
                $instance->init($pluginAPI);
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
                'SELECT `name`, `lang`, `installedContentTypes`' .
                ', `installedContentTypesLastUpdated`' .
                ', `installedPlugins`, `aclRules` FROM ${p}cmsState'
            ))) throw new PikeException('Failed to fetch cmsState',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        //
        return (object) [
            'siteInfo' => (object) [
                'name' => $row['name'],
                'lang' => $row['lang']
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
        $paths = $fs->readDir(RAD_PUBLIC_PATH . 'plugins', '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $to->append(new Plugin($clsName));
        }
    }
}

<?php

namespace RadCms;

use AltoRouter;
use RadCms\Common\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Plugin\PluginModule;
use RadCms\Common\FileSystemInterface;
use RadCms\Common\FileSystem;
use RadCms\Plugin\PluginInterface;
use Monolog\Logger;
use Monolog\Handler\ErrorLogHandler;
use RadCms\Common\LoggerAccess;
use RadCms\Framework\GenericArray;
use RadCms\Plugin\Plugin;

class RadCms {
    public $services;
    /**
     * RadCMS:n entry-point.
     *
     * @param \RadCms\Request $request
     */
    public function handleRequest($request) {
        $request->user = (object) ['id' => 1];
        if (($match = $this->services->router->match($request->path, $request->method))) {
            $request->params = $match['params'];
            $match['target']()($request, new Response());
        } else {
            header($_SERVER['SERVER_PROTOCOL'] . ' 404 Not Found');
        }
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array &$config
     * @param string $pluginsDir = 'Plugins'
     * @param \RadCms\Common\FileSystemInterface $fs = null
     * @param callable $getDb = null
     */
    public static function create(&$config,
                                  $pluginsDir = 'Plugins',
                                  $fs = null,
                                  $getDb = null) {
        $app = new RadCms();
        $app->services = (object) ['router' => new AltoRouter(),
                                   'db' => !$getDb ? new Db($config) : $getDb($config),
                                   'websiteStateRaw' => '',
                                   'plugins' => []];
        $config = ['wiped' => 'clean'];
        //
        ContentModule::init($app->services);
        AuthModule::init($app->services);
        PluginModule::init($app->services);
        $app->services->plugins = self::scanPlugins($pluginsDir,
                                                    $fs ?: new FileSystem(),
                                                    $app->services);
        foreach ($app->services->plugins->toArray() as $plugin) {
            if ($plugin->isInstalled) $plugin->impl->init($app->services);
        }
        WebsiteModule::init($app->services);
        //
        $logger = new Logger('mainLogger');
        $logger->pushHandler(new ErrorLogHandler());
        LoggerAccess::setLogger($logger);
        return $app;
    }
    private static function scanPlugins($pluginsDir,
                                        FileSystemInterface $fs,
                                        $services) {
        $pluginCollection = self::scanPluginsFromDisk($pluginsDir, $fs);
        self::syncPluginStates($pluginCollection, $services);
        self::instantiateInstalledPlugins($pluginCollection);
        return $pluginCollection;
    }
    private static function scanPluginsFromDisk($pluginsDir,
                                                FileSystemInterface $fs) {
        $out = new GenericArray(Plugin::class);
        $paths = $fs->readDir(RAD_BASE_PATH . 'src/' . $pluginsDir, '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "RadCms\\{$pluginsDir}\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new \RuntimeException("Main plugin class \"{$clsPath}\" missing");
            if (!array_key_exists(PluginInterface::class, class_implements($clsPath, false)))
                throw new \RuntimeException("A plugin (\"{$clsPath}\") must implement RadCms\Plugin\PluginInterface");
            $out->add($clsName, $clsPath);
        }
        return $out;
    }
    private static function syncPluginStates($pluginCollection, $services) {
        if (!($services->websiteStateRaw = $services->db->fetchOne(
            'select `layoutMatchers`,`activeContentTypes`,`installedPlugins`' .
            ' from ${p}websiteState'
        ))) {
            throw new \RuntimeException('Failed to fetch websiteState');
        }
        $installedPluginNames = json_decode($services->websiteStateRaw['installedPlugins']);
        if (!is_array($installedPluginNames)) $installedPluginNames = [];
        // Lisäosa on asennettu vain jos siitä löytyy merkintä tietokannasta.
        foreach ($pluginCollection->toArray() as &$plugin) {
            $plugin->isInstalled = in_array($plugin->name, $installedPluginNames);
        }
    }
    private static function instantiateInstalledPlugins($pluginCollection) {
        foreach ($pluginCollection->toArray() as &$plugin) {
            if ($plugin->isInstalled)
                $plugin->setImpl(new $plugin->classPath());
        }
    }
}

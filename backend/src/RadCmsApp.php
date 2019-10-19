<?php

namespace RadCms;

use Auryn\Injector;
use AltoRouter;
use RadCms\Framework\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Plugin\PluginModule;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;
use RadCms\Plugin\PluginInterface;
use Monolog\Logger;
use Monolog\Handler\ErrorLogHandler;
use RadCms\Common\LoggerAccess;
use RadCms\Plugin\PluginCollection;

class RadCmsApp {
    public $ctx;
    /**
     * RadCMS:n entry-point.
     *
     * @param \RadCms\Framework\Request $request
     * @param \Auryn\Injector $injector = new Auryn\Injector
     */
    public function handleRequest($request, $injector = null) {
        $request->user = (object) ['id' => 1];
        if (($match = $this->ctx->router->match($request->path, $request->method))) {
            $request->params = (object)$match['params'];
            $this->setupIocContainer($injector ?? new Injector(), $request);
            $this->ctx->injector->execute($this->makeRouteMatchInvokePath($match));
        } else {
            throw new \RuntimeException("No route for {$request->path}");
        }
    }
    /**
     * @param \Auryn\Injector $injector
     * @param \RadCms\Framework\Request $request
     */
    private function setupIocContainer($injector, $request) {
        $this->ctx->injector = $injector;
        $this->ctx->injector->share($this->ctx->db);
        $this->ctx->injector->share($this->ctx->plugins);
        $this->ctx->injector->share($request);
    }
    /**
     * @param array $match
     * @return string 'Cls\Path\To\Some\Controller::methodName'
     */
    private function makeRouteMatchInvokePath($match) {
        $ctrlInfo = $match['target']();
        if (!is_array($ctrlInfo) ||
            !is_string($ctrlInfo[0] ?? null) ||
            !is_string($ctrlInfo[1] ?? null)) {
            throw new \UnexpectedValueException(
                'A route must return [\'Ctrl\\Class\\Path\', \'methodName\'].');
        }
        return $ctrlInfo[0] . '::' . $ctrlInfo[1];
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array &$config
     * @param string $pluginsDir = 'Plugins'
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param \Closure $makeDb = new Db($config)
     */
    public static function create(&$config,
                                  $pluginsDir = 'Plugins',
                                  $fs = null,
                                  $makeDb = null) {
        $app = new RadCmsApp();
        $app->ctx = (object) ['injector' => null,
                              'router' => new AltoRouter(),
                              'db' => !$makeDb ? new Db($config) : $makeDb($config),
                              'websiteStateRaw' => null,
                              'plugins' => null];
        $app->ctx->router->addMatchTypes(['w' => '[0-9A-Za-z_]++']);
        $config = ['wiped' => 'clean'];
        //
        ContentModule::init($app->ctx);
        AuthModule::init($app->ctx);
        PluginModule::init($app->ctx);
        $app->ctx->plugins = self::scanAndMakePlugins($pluginsDir,
                                                      $fs ?? new FileSystem(),
                                                      $app->ctx);
        foreach ($app->ctx->plugins->toArray() as $plugin) {
            if ($plugin->isInstalled) $plugin->impl->init($app->ctx);
        }
        WebsiteModule::init($app->ctx);
        //
        $logger = new Logger('mainLogger');
        $logger->pushHandler(new ErrorLogHandler());
        LoggerAccess::setLogger($logger);
        return $app;
    }
    private static function scanAndMakePlugins($pluginsDir,
                                               FileSystemInterface $fs,
                                               $ctx) {
        $pluginCollection = self::scanAndMakePluginsFromDisk($pluginsDir, $fs);
        self::syncPluginStates($pluginCollection, $ctx);
        self::instantiateInstalledPlugins($pluginCollection);
        return $pluginCollection;
    }
    private static function scanAndMakePluginsFromDisk($pluginsDir,
                                                       FileSystemInterface $fs) {
        $out = new PluginCollection();
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
    private static function syncPluginStates($pluginCollection, $ctx) {
        if (!($ctx->websiteStateRaw = $ctx->db->fetchOne(
            'select `layoutMatchers`,`activeContentTypes`,`installedPlugins`' .
            ' from ${p}websiteState'
        ))) {
            throw new \RuntimeException('Failed to fetch websiteState');
        }
        $installedPluginNames = json_decode($ctx->websiteStateRaw['installedPlugins'], true);
        if (!is_array($installedPluginNames)) $installedPluginNames = [];
        // Lisäosa on asennettu vain jos siitä löytyy merkintä tietokannasta.
        foreach ($pluginCollection->toArray() as &$plugin) {
            $plugin->isInstalled = array_key_exists($plugin->name, $installedPluginNames);
        }
    }
    private static function instantiateInstalledPlugins($pluginCollection) {
        foreach ($pluginCollection->toArray() as &$plugin) {
            if ($plugin->isInstalled) $plugin->instantiate();
        }
    }
}

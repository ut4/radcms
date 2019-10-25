<?php

namespace RadCms;

use Auryn\Injector;
use AltoRouter;
use Monolog\Logger;
use Monolog\Handler\ErrorLogHandler;
use RadCms\Framework\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Plugin\PluginModule;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;
use RadCms\Plugin\PluginInterface;
use RadCms\Common\LoggerAccess;
use RadCms\Plugin\PluginCollection;
use RadCms\Plugin\API;
use RadCms\Framework\SessionInterface;
use RadCms\Framework\NativeSession;
use RadCms\Website\SiteConfig;
use RadCms\ContentType\ContentTypeCollection;

class App {
    private $ctx;
    public $plugins;
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
            $siteConfig = new SiteConfig();
            $siteConfig->load(new FileSystem, RAD_SITE_PATH . 'site.ini', false);
            $injector = $injector ?? new Injector();
            $this->setupIocContainer($injector, $request, $siteConfig->urlMatchers);
            $injector->execute($this->makeRouteMatchInvokePath($match));
        } else {
            throw new \RuntimeException("No route for {$request->path}");
        }
    }
    /**
     * @param \Auryn\Injector $container
     * @param \RadCms\Framework\Request $request
     * @param \RadCms\Website\UrlMatcherCollection $urlMatchers
     */
    private function setupIocContainer($container, $request, $urlMatchers) {
        $container->share($this->ctx->db);
        $container->share($this->ctx->contentTypes);
        $container->share($this->plugins);
        $container->share($urlMatchers);
        $container->share($request);
        $container->defineParam('frontendJsFiles', $this->ctx->frontendJsFiles);
        $container->alias(SessionInterface::class, NativeSession::class);
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
     * @param array|\RadCms\Framework\Db &$configOrDb
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param string $pluginsDir = 'Plugins'
     */
    public static function create(&$configOrDb,
                                  $fs = null,
                                  $pluginsDir = 'Plugins') {
        $logger = new Logger('mainLogger');
        $logger->pushHandler(new ErrorLogHandler());
        LoggerAccess::setLogger($logger);
        //
        $app = new App();
        $app->plugins = null;
        $configWasProvided = !($configOrDb instanceof Db);
        $app->ctx = (object) ['router' => new AltoRouter(),
                              'db' => $configWasProvided ? new Db($configOrDb) : $configOrDb,
                              'contentTypes' => null,
                              'frontendJsFiles' => []];
        $app->ctx->router->addMatchTypes(['w' => '[0-9A-Za-z_]++']);
        if ($configWasProvided) $configOrDb = ['wiped' => 'clean'];
        //
        [$installedPluginNames, $app->ctx->contentTypes] = self::fetchAndParseWebsiteState($app->ctx->db);
        self::scanAndInitPlugins($pluginsDir, $fs ?? new FileSystem(), $app, $installedPluginNames);
        ContentModule::init($app->ctx);
        AuthModule::init($app->ctx);
        PluginModule::init($app->ctx);
        WebsiteModule::init($app->ctx);
        //
        return $app;
    }
    private static function fetchAndParseWebsiteState($db) {
        if (!($row = $db->fetchOne(
            'select `activeContentTypes`, `installedPlugins`' .
            ' from ${p}websiteState'
        ))) {
            throw new \RuntimeException('Failed to fetch websiteState');
        }
        //
        $installedPluginNames = json_decode($row['installedPlugins'], true);
        if (!is_array($installedPluginNames)) $installedPluginNames = [];
        //
        if (!($ctypesData = json_decode($row['activeContentTypes'], true)))
            throw new \RuntimeException('Failed to parse activeContentTypes');
        $contentTypes = new ContentTypeCollection();
        foreach ($ctypesData as $ctypeName => $remainingArgs)
            $contentTypes->add($ctypeName, ...$remainingArgs);
        //
        return [$installedPluginNames, $contentTypes];
    }
    private static function scanAndInitPlugins($pluginsDir, $fs, $app, $installedPluginNames) {
        $app->plugins = self::scanPluginsFromDisk($pluginsDir, $fs);
        $pluginApi = new API($app->ctx->router, $app->ctx->frontendJsFiles);
        foreach ($app->plugins->toArray() as &$plugin) {
            if (($plugin->isInstalled = array_key_exists($plugin->name, $installedPluginNames))) {
                $plugin->instantiate();
                $plugin->impl->init($pluginApi);
            }
        }
    }
    private static function scanPluginsFromDisk($pluginsDir,
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
}

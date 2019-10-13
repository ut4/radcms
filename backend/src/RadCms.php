<?php

namespace RadCms;

use RadCms\Router;
use RadCms\Common\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Common\FileSystemInterface;
use RadCms\Common\FileSystem;
use RadCms\Framework\GenericArray;
use RadCms\Content\ContentTypeDef;
use RadCms\Plugins\PluginInterface;
use Monolog\Logger;
use Monolog\Handler\ErrorLogHandler;
use RadCms\Common\LoggerAccess;

class RadCms {
    public $services;
    /**
     * RadCMS:n entry-point.
     *
     * @param \RadCms\Request $request
     */
    public function handleRequest($request) {
        $request->user = (object) ['id' => 1];
        $this->services->router->dispatch($request);
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array &$config
     * @param string $pluhinsDir = 'Plugins'
     * @param \RadCms\Common\FileSystemInterface $fs = null
     * @param callable $getDb = null
     */
    public static function create(&$config,
                                  $pluginsDir = 'Plugins',
                                  $fs = null,
                                  $getDb = null) {
        $app = new RadCms();
        $app->services = (object) ['router' => new Router(),
                                   'db' => !$getDb ? new Db($config) : $getDb(),
                                   'plugins' => [],
                                   'contentTypes' => new GenericArray(ContentTypeDef::class)];
        $config = ['wiped' => 'clean'];
        //
        ContentModule::init($app->services);
        AuthModule::init($app->services);
        WebsiteModule::init($app->services);
        $app->services->plugins = self::registerPlugins($pluginsDir,
                                                        $fs ?: new FileSystem());
        foreach ($app->services->plugins as $plugin) {
            $plugin::init($app->services);
        }
        //
        $logger = new Logger('mainLogger');
        $logger->pushHandler(new ErrorLogHandler());
        LoggerAccess::setLogger($logger);
        return $app;
    }
    private static function registerPlugins($pluginsDir,
                                            FileSystemInterface $fs) {
        $out = [];
        $paths = $fs->readDir(RAD_BASE_PATH . 'src/' . $pluginsDir, '*', GLOB_ONLYDIR);
        foreach ($paths as $path) {
            $clsName = substr($path, strrpos($path, '/') + 1);
            $clsPath = "RadCms\\{$pluginsDir}\\{$clsName}\\{$clsName}";
            if (!class_exists($clsPath))
                throw new \RuntimeException("Main plugin class \"{$clsPath}\" missing");
            array_push($out, new $clsPath());
            if (!($out[count($out) - 1] instanceof PluginInterface))
                throw new \RuntimeException("A plugin (\"{$clsPath}\") must implement RadCms\Plugins\PluginInterface");
        }
        return $out;
    }
}

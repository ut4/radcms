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
use RadCms\Common\LoggerAccess;
use RadCms\Framework\SessionInterface;
use RadCms\Framework\NativeSession;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;

class App {
    protected $ctx;
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
            $injector = $injector ?? new Injector();
            $this->setupIocContainer($injector, $request);
            $injector->execute($this->makeRouteMatchInvokePath($match));
        } else {
            throw new \RuntimeException("No route for {$request->path}");
        }
    }
    /**
     * @param \Auryn\Injector $container
     * @param \RadCms\Framework\Request $request
     */
    private function setupIocContainer($container, $request) {
        $container->share($this->ctx->db);
        $container->share($this->ctx->state);
        $container->share($this->ctx->state->plugins);
        $container->share($this->ctx->state->contentTypes);
        $container->share($request);
        $container->alias(FileSystemInterface::class, FileSystem::class);
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
        $app = new static();
        $configWasProvided = !($configOrDb instanceof Db);
        $app->ctx = (object) ['router' => new AltoRouter(),
                              'db' => $configWasProvided ? new Db($configOrDb) : $configOrDb,
                              'state' => null,];
        $app->ctx->router->addMatchTypes(['w' => '[0-9A-Za-z_]++']);
        if ($configWasProvided) $configOrDb = ['wiped' => 'clean'];
        $app->ctx->state = new AppState($app->ctx->db, $fs ?? new FileSystem());
        $app->ctx->state->selfLoad($pluginsDir, $app->ctx->router);
        ContentModule::init($app->ctx);
        AuthModule::init($app->ctx);
        PluginModule::init($app->ctx);
        WebsiteModule::init($app->ctx);
        //
        return $app;
    }
}

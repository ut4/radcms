<?php

namespace RadCms;

use Auryn\Injector;
use AltoRouter;
use RadCms\Framework\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Plugin\PluginModule;
use RadCms\Framework\SessionInterface;
use RadCms\Framework\NativeSession;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;
use RadCms\Auth\Authenticator;
use RadCms\Auth\Crypto;
use RadCms\Auth\CachingServicesFactory;
use RadCms\Common\RadException;

class App {
    protected $ctx;
    /**
     * RadCMS:n entry-point.
     *
     * @param \RadCms\Framework\Request $request
     * @param \Auryn\Injector $injector = new Auryn\Injector
     */
    public function handleRequest($request, $injector = null) {
        $request->user = $this->ctx->auth->getIdentity();
        if (($match = $this->ctx->router->match($request->path, $request->method))) {
            $request->params = (object)$match['params'];
            $injector = $injector ?? new Injector();
            $this->setupIocContainer($injector, $request);
            // @allow \RadCms\Common\RadException
            $injector->execute($this->makeRouteMatchInvokePath($match));
        } else {
            throw new RadException("No route for {$request->path}");
        }
    }
    /**
     * @param \Auryn\Injector $container
     * @param \RadCms\Framework\Request $request
     */
    private function setupIocContainer($container, $request) {
        $container->share($this->ctx->db);
        $container->share($this->ctx->state);
        $container->share($this->ctx->auth);
        $container->share($this->ctx->state->plugins);
        $container->share($this->ctx->state->contentTypes);
        $container->share($request);
        $container->alias(FileSystemInterface::class, FileSystem::class);
        $container->alias(SessionInterface::class, NativeSession::class);
    }
    /**
     * @param array $match
     * @return string 'Cls\Path\To\Some\Controller::methodName'
     * @throws \RadCms\Common\RadException
     */
    private function makeRouteMatchInvokePath($match) {
        $ctrlInfo = $match['target']();
        if (!is_array($ctrlInfo) ||
            !is_string($ctrlInfo[0] ?? null) ||
            !is_string($ctrlInfo[1] ?? null)) {
            throw new RadException(
                'A route must return [\'Ctrl\\Class\\Path\', \'methodName\'].',
                RadException::BAD_INPUT);
        }
        return $ctrlInfo[0] . '::' . $ctrlInfo[1];
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array|object &$configOrCtx
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param string $pluginsDir = 'Plugins'
     */
    public static function create(&$configOrCtx, $pluginsDir = 'Plugins') {
        //
        $app = new static();
        $app->ctx = self::makeCtx($configOrCtx);
        $app->ctx->router->addMatchTypes(['w' => '[0-9A-Za-z_]++']);
        $app->ctx->state = new AppState($app->ctx->db, $app->ctx->fs ?? new FileSystem());
        $app->ctx->state->selfLoad($pluginsDir, $app->ctx->router);
        ContentModule::init($app->ctx);
        AuthModule::init($app->ctx);
        PluginModule::init($app->ctx);
        WebsiteModule::init($app->ctx);
        //
        return $app;
    }
    /**
     * @param array|object &$configOrCtx
     * @return object
     */
    private static function makeCtx(&$configOrCtx) {
        if (!($configOrCtx instanceof \stdClass)) {
            $out = (object) ['router' => new AltoRouter(),
                             'auth' => null,
                             'db' => new Db($configOrCtx),
                             'state' => null,];
            $configOrCtx = ['wiped' => 'clean'];
            $out->auth = new Authenticator(new Crypto, new CachingServicesFactory($out->db));
            return $out;
        }
        if (!isset($configOrCtx->db))
            throw new \InvalidArgumentException('Can\'t make db without config');
        $out = (object) ['router' => $configOrCtx->router ?? new AltoRouter(),
                         'auth' => null,
                         'db' => $configOrCtx->db,
                         'state' => null,
                         'fs' => null];
        $out->auth = $configOrCtx->auth ??
            new Authenticator(new Crypto, new CachingServicesFactory($out->db));
        $out->fs = $configOrCtx->fs ?? null;
        return $out;
    }
}

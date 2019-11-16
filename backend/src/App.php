<?php

namespace RadCms;

use Auryn\Injector;
use AltoRouter;
use RadCms\Framework\Db;
use RadCms\Content\ContentModule;
use RadCms\ContentType\ContentTypeModule;
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
use RadCms\Framework\Response;
use RadCms\Framework\Translator;

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
            // @allow \RadCms\Common\RadException
            [$ctrlClassPath, $ctrlMethodName, $requireAuth] =
                $this->validateRouteMatch($match);
            if ($requireAuth && !$request->user) {
                (new Response(403))->json(['err' => 'Login required']);
            } else {
                $injector = $injector ?? new Injector();
                $this->setupIocContainer($injector, $request);
                $injector->execute($ctrlClassPath . '::' . $ctrlMethodName);
            }
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
        $container->share($this->ctx->auth);
        $container->share($this->ctx->translator);
        $container->share($this->ctx->state);
        $container->share($this->ctx->state->plugins);
        $container->share($this->ctx->state->contentTypes);
        $container->share($request);
        $container->alias(FileSystemInterface::class, FileSystem::class);
        $container->alias(SessionInterface::class, NativeSession::class);
    }
    /**
     * @param array $match
     * @return array [string, string, bool]
     * @throws \RadCms\Common\RadException
     */
    private function validateRouteMatch($match) {
        $routeInfo = $match['target']();
        if (!is_array($routeInfo) ||
            count($routeInfo) !== 3 ||
            !is_string($routeInfo[0]) ||
            !is_string($routeInfo[1]) ||
            !is_bool($routeInfo[2])) {
            throw new RadException(
                'A route (' . json_encode($routeInfo) . ') must return [\'Ctrl\\Class\\Path\',' .
                ' \'methodName\', \'requireAuth\' ? true : false].',
                RadException::BAD_INPUT);
        }
        return $routeInfo;
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array|object &$configOrCtx
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     */
    public static function create(&$configOrCtx) {
        //
        $app = new static();
        $app->ctx = self::makeCtx($configOrCtx);
        $app->ctx->router->addMatchTypes(['w' => '[0-9A-Za-z_]++']);
        $app->ctx->state = new AppState($app->ctx->db, $app->ctx->fs ?? new FileSystem());
        $app->ctx->state->selfLoad($app->ctx->router);
        ContentModule::init($app->ctx);
        ContentTypeModule::init($app->ctx);
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
        $userCtx = new \stdClass;
        $out = (object) ['router' => null, 'auth' => null, 'db' => null,
                         'state' => null, 'translator' => null];
        if (!($configOrCtx instanceof \stdClass)) {
            $out->db = new Db($configOrCtx);
            $configOrCtx = ['wiped' => 'clean'];
        } else {
            if (!isset($configOrCtx->db))
                throw new \InvalidArgumentException('Can\'t make db without config');
            $out->db = $configOrCtx->db;
            $userCtx = $configOrCtx;
        }
        $out->router = $userCtx->router ?? new AltoRouter();
        $out->auth = $userCtx->auth ?? new Authenticator(new Crypto,
                                                         new CachingServicesFactory($out->db));
        $out->fs = $userCtx->fs ?? null;
        $out->translator = $userCtx->translator ?? new Translator(function () use ($out) {
            $mainLangFilePath = RAD_SITE_PATH . 'translations/' .
                $out->state->websiteState->lang . '.php';
            return $this->fs->isFile($mainLangFilePath) ? include $mainLangFilePath : [];
        });
        return $out;
    }
}

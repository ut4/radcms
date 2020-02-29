<?php

namespace RadCms;

use Auryn\Injector;
use Pike\Translator;
use Pike\FileSystem;
use Pike\PikeException;
use Pike\App as PikeApp;
use RadCms\Auth\AuthModule;
use RadCms\Content\ContentModule;
use RadCms\ContentType\ContentTypeModule;
use RadCms\Packager\PackagerModule;
use RadCms\Plugin\PluginModule;
use RadCms\Upload\UploadModule;
use RadCms\User\UserModule;
use RadCms\Website\WebsiteModule;
use RadCms\Auth\ACL;

class App {
    private static $ctx; // Lainattu \Pike\App:lta
    private static $fs;
    /**
     * @param array $config
     * @param \stdClass $ctx = null
     * @param callable $makeInjector = null fn(): \Auryn\Injector
     * @return \Pike\App
     * @throws \Pike\PikeException
     */
    public static function create($config, $ctx = null, $makeInjector = null) {
        return PikeApp::create([
            self::class,
            AuthModule::class,
            ContentModule::class,
            ContentTypeModule::class,
            PackagerModule::class,
            PluginModule::class,
            UploadModule::class,
            UserModule::class,
            WebsiteModule::class,
        ], $config, $ctx, $makeInjector);
    }
    /**
     * @param \stdClass $ctx
     * @throws \Pike\PikeException
     */
    public static function init(\stdClass $ctx) {
        self::$fs = $ctx->fs ?? new FileSystem(); // translaattorille
        // @allow \Pike\PikeException
        $ctx->db->open();
        // @allow \Pike\PikeException
        $ctx->cmsState = CmsStateLoader::getAndInitStateFromDb($ctx->db,
                                                               self::$fs,
                                                               $ctx->router);
        $ctx->acl = new ACL;
        $ctx->acl->setRules($ctx->cmsState->getAclRules());
        if (!isset($ctx->translator))
            $ctx->translator = new Translator(function () use ($ctx) {
                $mainLangFilePath = RAD_SITE_PATH . 'translations/' .
                    $ctx->cmsState->getSiteInfo()->lang . '.php';
                return self::$fs->isFile($mainLangFilePath) ? include $mainLangFilePath : [];
            });
        $ctx->router->on('*', function ($req, $res, $next) use ($ctx) {
            $req->user = $ctx->auth->getIdentity();
            $aclActionAndResource = $req->routeCtx->myData;
            if (!$aclActionAndResource)
                throw new PikeException('A route context must be a non-empty ' .
                                        'string or \RadCms\Auth\ACL::NO_NAME',
                                        PikeException::BAD_INPUT);
            if ($aclActionAndResource === ACL::NO_NAME)
                $next();
            elseif (!$req->user)
                $res->status(401)->json(['err' => 'Login required']);
            elseif (!$ctx->acl->can($req->user->role,
                                    ...explode(':', $aclActionAndResource)))
                $res->status(403)->json(['err' => 'Not permitted']);
        });
        self::$ctx = $ctx;
    }
    /**
     * @param \Auryn\Injector $container
     * @throws \Pike\PikeException
     */
    public static function alterIoc(Injector $container) {
        $container->share(self::$ctx->acl);
        $container->share(self::$ctx->cmsState);
        $container->share(self::$ctx->translator);
        $container->share(self::$ctx->cmsState->getContentTypes());
    }
}

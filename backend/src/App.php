<?php

declare(strict_types=1);

namespace RadCms;

use RadCms\AppContext;
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
    /** @var \RadCms\AppContext */
    private static $ctx; // Lainattu \Pike\App:lta
    /** @var \Pike\FileSystemInterface */
    private static $fs;
    /**
     * @param array $config
     * @param \Pike\AppContext $ctx
     * @param callable $makeInjector = null fn(): \Auryn\Injector
     * @return \Pike\App
     * @throws \Pike\PikeException
     */
    public static function create($config,
                                  AppContext $ctx,
                                  callable $makeInjector = null): PikeApp {
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
     * @param \RadCms\AppContext $ctx
     * @throws \Pike\PikeException
     */
    public static function init(AppContext $ctx): void {
        self::$fs = $ctx->fs ?? new FileSystem(); // translaattorille
        // @allow \Pike\PikeException
        $ctx->db->open();
        // @allow \Pike\PikeException
        $ctx->cmsState = CmsStateLoader::getAndInitStateFromDb($ctx->db,
                                                               self::$fs,
                                                               $ctx->router);
        $ctx->acl = new ACL((bool)(RAD_FLAGS & RAD_DEVMODE));
        $ctx->acl->setRules($ctx->cmsState->getAclRules());
        if (!$ctx->translator) $ctx->translator = new Translator;
        $ctx->router->on('*', function ($req, $res, $next) use ($ctx) {
            $req->user = $ctx->auth->getIdentity();
            $aclActionAndResource = $req->routeInfo->myCtx;
            if (!$aclActionAndResource)
                throw new PikeException('A route context must be a non-empty ' .
                                        'string or \RadCms\Auth\ACL::NO_IDENTITY',
                                        PikeException::BAD_INPUT);
            if ($aclActionAndResource === ACL::NO_IDENTITY)
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
    public static function alterIoc(Injector $container): void {
        $container->share(self::$ctx->acl);
        $container->share(self::$ctx->cmsState);
        $container->share(self::$ctx->cmsState->getContentTypes());
        $container->delegate(Translator::class, function () {
            $t = self::$ctx->translator;
            if (!$t->hasKey('__loaded')) {
                $mainLangFilePath = RAD_PUBLIC_PATH . 'translations/' .
                    self::$ctx->cmsState->getSiteInfo()->lang . '.php';
                if (self::$fs->isFile($mainLangFilePath))
                    $t->addStrings(require $mainLangFilePath);
                $t->addStrings(['__loaded' => 'yo']);
            }
            return $t;
        });
    }
}

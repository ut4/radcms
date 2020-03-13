<?php

namespace RadCms\Packager;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\CmsState cmsState, \Pike\Translator translator}
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/packager',
            [PackagerControllers::class, 'handleCreatePackage', 'pack:websites']
        );
        $ctx->router->map('GET', '/api/packager/pre-run',
            [PackagerControllers::class, 'handlePreRunCreatePackage', 'prePack:websites']
        );
    }
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC($container) {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

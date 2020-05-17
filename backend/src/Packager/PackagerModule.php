<?php

namespace RadCms\Packager;

use RadCms\AppContext;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx) {
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

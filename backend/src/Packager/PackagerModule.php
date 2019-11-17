<?php

namespace RadCms\Packager;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/packager/[**:signingKey]', function () {
            return [PackagerControllers::class, 'handleCreatePackage', true];
        });
    }
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC($container) {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

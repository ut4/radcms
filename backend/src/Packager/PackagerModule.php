<?php

namespace RadCms\Packager;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/packager',
            [PackagerControllers::class, 'handleCreatePackage', 'pack:websites']
        );
    }
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC($container) {
        $container->alias(PackageStreamInterface::class, PlainTextPackageStream::class);
    }
}

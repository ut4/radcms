<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Auryn\Injector;
use RadCms\AppContext;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('POST', '/api/packager',
            [PackagerControllers::class, 'handleCreatePackage', 'pack:websites']
        );
        $ctx->router->map('GET', '/api/packager/includables/[templates|assets|uploads|plugins:groupName]',
            [PackagerControllers::class, 'handleGetIncludables', 'prePack:websites']
        );
    }
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC(Injector $container): void {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

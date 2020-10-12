<?php

declare(strict_types=1);

namespace RadCms\Packager;

use RadCms\AppContext;

abstract class PackagerModule {
    /**
     * Rekisteröi /api/packager -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('POST', '/api/packager',
            [PackagerControllers::class, 'handleCreatePackage', 'pack:websites:json']
        );
        $ctx->router->map('GET', '/api/packager/includables/[templates|assets|uploads|plugins:groupName]',
            [PackagerControllers::class, 'handleGetIncludables', 'prePack:websites:']
        );
    }
}

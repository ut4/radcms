<?php

declare(strict_types=1);

namespace RadCms\Update;

use RadCms\AppContext;

abstract class UpdateModule {
    /**
     * Rekisteröi /api/updates -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/api/updates',
            [UpdateControllers::class, 'getUpdatePackagesFromServer', 'update:cms:']
        );
        $ctx->router->map('PUT', '/api/updates',
            [UpdateControllers::class, 'updateCms', 'update:cms:json']
        );
    }
}

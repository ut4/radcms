<?php

declare(strict_types=1);

namespace RadCms\User;

use RadCms\AppContext;

abstract class UserModule {
    /**
     * Rekisteröi /api/users -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/api/users/me',
            [UserControllers::class, 'handleGetCurrentUser', 'viewItsOwn:profile']
        );
    }
}

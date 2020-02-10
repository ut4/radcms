<?php

namespace RadCms\Auth;

use RadCms\Auth\AuthControllers;

abstract class AuthModule {
    public const ROLE_SUPER_ADMIN = 0;
    public const ROLE_VIEWER = 255;
    /**
     * Rekisteröi /auth-alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/login',
            [AuthControllers::class, 'renderLoginView', false]
        );
        $ctx->router->map('POST', '/api/login',
            [AuthControllers::class, 'handleLoginFormSubmit', false]
        );
        $ctx->router->map('POST', '/api/logout',
            [AuthControllers::class, 'handleLogoutRequest', true]
        );
        $ctx->router->map('GET', '/request-password-reset',
            [AuthControllers::class, 'renderRequestPassResetView', false]
        );
        $ctx->router->map('POST', '/api/request-password-reset',
            [AuthControllers::class, 'handleRequestPassResetFormSubmit', false]
        );
        $ctx->router->map('GET', '/finalize-password-reset/[**:key]',
            [AuthControllers::class, 'renderFinalizePassResetView', false]
        );
        $ctx->router->map('POST', '/api/finalize-password-reset',
            [AuthControllers::class, 'handleFinalizePassResetFormSubmit', false]
        );
    }
}

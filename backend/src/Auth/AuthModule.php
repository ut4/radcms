<?php

namespace RadCms\Auth;

use RadCms\Auth\AuthControllers;

abstract class AuthModule {
    /**
     * Rekisteröi /auth-alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/login', function () {
            return [AuthControllers::class, 'renderLoginView', false];
        });
        $ctx->router->map('POST', '/login', function () {
            return [AuthControllers::class, 'handleLoginFormSubmit', false];
        });
    }
}

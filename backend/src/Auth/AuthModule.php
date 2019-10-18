<?php

namespace RadCms\Auth;

use RadCms\Auth\AuthControllers;

abstract class AuthModule {
    /**
     * Rekisteröi /auth-alkuiset http-reitit.
     *
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () {
            return new AuthControllers();
        };
        $services->router->map('GET', '/login', function () use ($makeCtrl) {
            return [$makeCtrl(), 'renderLoginView'];
        });
    }
}

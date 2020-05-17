<?php

namespace RadCms\Auth;

use RadCms\AppContext;
use RadCms\Auth\AuthControllers;

abstract class AuthModule {
    /**
     * Rekisteröi autentikointiin liittyvät http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/login',
            [AuthControllers::class, 'renderLoginView', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/login',
            [AuthControllers::class, 'handleLoginFormSubmit', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/logout',
            [AuthControllers::class, 'handleLogoutRequest', 'logout:auth']
        );
        $ctx->router->map('GET', '/request-password-reset',
            [AuthControllers::class, 'renderRequestPassResetView', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/request-password-reset',
            [AuthControllers::class, 'handleRequestPassResetFormSubmit',
             ACL::NO_IDENTITY]
        );
        $ctx->router->map('GET', '/finalize-password-reset/[**:key]',
            [AuthControllers::class, 'renderFinalizePassResetView', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/finalize-password-reset',
            [AuthControllers::class, 'handleFinalizePassResetFormSubmit', ACL::NO_IDENTITY]
        );
        $ctx->router->map('POST', '/api/update-password',
            [AuthControllers::class, 'handleUpdatePasswordRequest', 'updatePass:auth']
        );
    }
}

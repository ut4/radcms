<?php

namespace RadCms\Auth;

use Pike\PikeException;
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
        $ctx->router->on('*', function ($req, $res, $next) use ($ctx) {
            $aclActionAndResource = $req->routeInfo->myCtx;
            if (!$aclActionAndResource)
                throw new PikeException('A route context must be a non-empty ' .
                                        'string or \RadCms\Auth\ACL::NO_IDENTITY',
                                        PikeException::BAD_INPUT);
            if ($aclActionAndResource === ACL::NO_IDENTITY) {
                $next();
                return;
            }
            $req->user = $ctx->auth->getIdentity();
            if (!$req->user)
                $res->status(401)->json(['err' => 'Login required']);
            elseif (!$ctx->acl->can($req->user->role,
                                    ...explode(':', $aclActionAndResource)))
                $res->status(403)->json(['err' => 'Not permitted']);
        });
    }
}

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
            [AuthControllers::class, 'handleLogoutRequest', 'logout:auth:json']
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
            [AuthControllers::class, 'handleUpdatePasswordRequest', 'updatePass:auth:json']
        );
        $ctx->router->on('*', function ($req, $res, $next) use ($ctx) {
            $csrfHeader = null;
            if (strpos($req->path, '/api') === 0 &&
                ($csrfHeader = $req->header('X-Requested-With')) === null)
                throw new PikeException('Invalid request',
                                        PikeException::BAD_INPUT);
            $routeCtx = $req->routeInfo->myCtx;
            if (!$routeCtx)
                throw new PikeException('Invalid route context',
                                        PikeException::BAD_INPUT);
            if ($routeCtx === ACL::NO_IDENTITY) {
                $next();
                return;
            }
            [$aclAction, $aclResource, $consumes] = explode(':', $routeCtx);
            if ($consumes) {
                $expectedContentType = [
                    'json' => 'application/json',
                    'urlEncoded' => 'application/x-www-form-urlencoded',
                    'multiPart' => 'multipart/form-data',
                ][$consumes];
                if (strpos($req->header('Content-Type'), $expectedContentType) !== 0) {
                    $res->status(415)->plain("Expected `{$expectedContentType}` but got `{$req->header('Content-Type')}`");
                    return;
                }
            }
            $req->myData = (object) ['user' => $ctx->auth->getIdentity()];
            $user = $req->myData->user;
            if (!$user)
                $res->status(401)->json(['err' => 'Login required']);
            elseif (!$ctx->acl->can($user->role, $aclAction, $aclResource))
                $res->status(403)->json(['err' => 'Not permitted']);
            elseif (!$csrfHeader) {
                $req->myData->csrfToken = $ctx->auth->getPerSessionCsrfToken();
                if (!in_array($req->method, ['GET', 'HEAD', 'OPTIONS', 'TRACE']) &&
                    ($req->body->csrfToken ?? $req->params->csrfToken ?? '') !== $req->myData->csrfToken)
                    $res->status(403)->json(['err' => 'Token verification failed']);
            }
        });
    }
}

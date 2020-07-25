<?php

declare(strict_types=1);

namespace RadCms\Website;

use RadCms\AppContext;
use RadCms\Auth\ACL;

abstract class WebsiteModule {
    /**
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/_edit/[**:url]?',
            [AdminControllers::class, 'handleEditViewRequest', 'access:editMode']
        );
        $ctx->router->map('GET', '[*:url]',
            [WebsiteControllers::class, 'handlePageRequest', ACL::NO_IDENTITY]
        );
        if (RAD_QUERY_VAR === '') {
            $ctx->router->on('*', function ($req, $res, $next) {
                if (strpos($req->path, '.') === false)
                    $next();
                else
                    $res->status(404)->plain('Not found.');
            });
        }
    }
}

<?php

namespace RadCms\Website;

use RadCms\Auth\ACL;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/edit/[**:q]?',
            [AdminControllers::class, 'handleEditViewRequest', 'access:editMode']
        );
        $ctx->router->map('GET', '*',
            [WebsiteControllers::class, 'handlePageRequest', ACL::NO_NAME]
        );
    }
}

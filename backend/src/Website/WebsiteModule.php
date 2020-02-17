<?php

namespace RadCms\Website;

use RadCms\Auth\ACL;

abstract class WebsiteModule {
    /**
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\AppState state, \Pike\Translator translator}
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

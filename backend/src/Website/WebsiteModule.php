<?php

declare(strict_types=1);

namespace RadCms\Website;

use RadCms\Auth\ACL;

abstract class WebsiteModule {
    /**
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\CmsState cmsState, \Pike\Translator translator}
     */
    public static function init(\stdClass $ctx): void {
        $ctx->router->map('GET', '/edit/[**:q]?',
            [AdminControllers::class, 'handleEditViewRequest', 'access:editMode']
        );
        $ctx->router->map('GET', '*',
            [WebsiteControllers::class, 'handlePageRequest', ACL::NO_IDENTITY]
        );
    }
}

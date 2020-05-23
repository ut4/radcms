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
        $ctx->router->map('GET', '*',
            [WebsiteControllers::class, 'handlePageRequest', ACL::NO_IDENTITY]
        );
    }
}

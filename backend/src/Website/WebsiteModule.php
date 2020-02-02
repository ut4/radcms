<?php

namespace RadCms\Website;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/edit/[**:q]?',
            [AdminControllers::class, 'handleEditViewRequest', true]
        );
        $ctx->router->map('GET', '*',
            [WebsiteControllers::class, 'handlePageRequest', false]
        );
    }
}

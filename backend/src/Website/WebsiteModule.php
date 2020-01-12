<?php

namespace RadCms\Website;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/edit/[**:q]?', function () {
            return [AdminControllers::class, 'handleEditViewRequest', true];
        });
        $ctx->router->map('GET', '*', function () {
            return [WebsiteControllers::class, 'handlePageRequest', false];
        });
    }
}

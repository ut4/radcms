<?php

namespace RadCms\Website;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/cpanel/[i:dataKey]', function () {
            return [AdminControllers::class, 'handleRenderCpanelRequest', true];
        });
        $ctx->router->map('GET', '*', function () {
            return [WebsiteControllers::class, 'handlePageRequest', false];
        });
    }
}

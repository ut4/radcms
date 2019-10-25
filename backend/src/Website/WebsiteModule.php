<?php

namespace RadCms\Website;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/cpanel/[i:dataKey]', function () {
            return [AdminControllers::class, 'handleRenderCpanelRequest'];
        });
        $ctx->router->map('GET', '*', function () use ($ctx) {
            return [WebsiteControllers::class, 'handlePageRequest'];
        });
    }
}

<?php

namespace RadCms\Content;

use RadCms\Content\ContentControllers;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content, ja /api/content-type -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/content/[i:id]', function () {
            return [ContentControllers::class, 'handleGetContentNode', true];
        });
        $ctx->router->map('GET', '/api/content-types/[i:id]', function () {
            return [ContentControllers::class, 'handleGetContentType', true];
        });
    }
}

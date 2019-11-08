<?php

namespace RadCms\Content;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]', function () {
            return [ContentControllers::class, 'handleGetContentNode', true];
        });
        $ctx->router->map('PUT', '/api/content/[i:id]/[w:contentTypeName]', function () {
            return [ContentControllers::class, 'handleUpdateContentNode', true];
        });
    }
}

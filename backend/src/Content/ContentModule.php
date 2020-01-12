<?php

namespace RadCms\Content;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/content/[w:contentTypeName]/[with-revision:revisionSettings]?', function () {
            return [ContentControllers::class, 'handleCreateContentNode', true];
        });
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]', function () {
            return [ContentControllers::class, 'handleGetContentNode', true];
        });
        $ctx->router->map('GET', '/api/content/[w:contentTypeName]', function () {
            return [ContentControllers::class, 'handleGetContentNodesByType', true];
        });
        $ctx->router->map('PUT', '/api/content/[i:id]/[w:contentTypeName]/[publish:revisionSettings]?', function () {
            return [ContentControllers::class, 'handleUpdateContentNode', true];
        });
    }
}

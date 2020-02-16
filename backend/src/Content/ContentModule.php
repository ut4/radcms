<?php

namespace RadCms\Content;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/content/[w:contentTypeName]/[with-revision:revisionSettings]?',
            [ContentControllers::class, 'handleCreateContentNode', 'create:content']
        );
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleGetContentNode', 'view:content']
        );
        $ctx->router->map('GET', '/api/content/[w:contentTypeName]',
            [ContentControllers::class, 'handleGetContentNodesByType', 'view:content']
        );
        $ctx->router->map('PUT', '/api/content/[i:id]/[w:contentTypeName]/[publish:revisionSettings]?',
            [ContentControllers::class, 'handleUpdateContentNode', 'update:content']
        );
    }
}

<?php

declare(strict_types=1);

namespace RadCms\Content;

use RadCms\AppContext;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('POST', '/api/content/[w:contentTypeName]/[with-revision:revisionSettings]?',
            [ContentControllers::class, 'handleCreateContentNode', 'create:content']
        );
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleGetContentNode', 'view:content']
        );
        $ctx->router->map('GET', '/api/content/[w:contentTypeName]/[*:filters]?',
            [ContentControllers::class, 'handleGetContentNodesByType', 'view:content']
        );
        $ctx->router->map('PUT', '/api/content/[i:id]/[w:contentTypeName]/[publish|unpublish:revisionSettings]?',
            [ContentControllers::class, 'handleUpdateContentNode', 'update:content']
        );
        $ctx->router->map('DELETE', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleDeleteContentNode', 'delete:content']
        );
    }
}

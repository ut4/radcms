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
        $ctx->router->map('POST', '/api/content/[w:contentTypeName]/[as-draft:publishSettings]?',
            [ContentControllers::class, 'handleCreateContentNode', 'create:content:json']
        );
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleGetContentNode', 'view:content:']
        );
        $ctx->router->map('GET', '/api/content/[i:id]/[w:contentTypeName]/revisions',
            [ContentControllers::class, 'handleGetContentNodeRevisions', 'view:content:']
        );
        $ctx->router->map('GET', '/api/content/[w:contentTypeName]/[*:filters]?',
            [ContentControllers::class, 'handleGetContentNodesByType', 'view:content:']
        );
        $ctx->router->map('PUT', '/api/content/[i:id]/[w:contentTypeName]/[publish|unpublish:publishSettings]?',
            [ContentControllers::class, 'handleUpdateContentNode', 'update:content:json']
        );
        $ctx->router->map('DELETE', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleDeleteContentNode', 'delete:content:']
        );
    }
}

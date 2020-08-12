<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use RadCms\AppContext;

abstract class ContentTypeModule {
    /**
     * Rekisteröi /api/content-types -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('POST', '/api/content-types/field/[w:contentTypeName]',
            [ContentTypeControllers::class, 'handleAddFieldToContentType', 'addField:contentTypes']
        );
        $ctx->router->map('PUT', '/api/content-types/field/[w:contentTypeName]/[w:fieldName]',
            [ContentTypeControllers::class, 'handleUpdateFieldOfContentType', 'updateField:contentTypes']
        );
        $ctx->router->map('DELETE', '/api/content-types/field/[w:contentTypeName]/[w:fieldName]',
            [ContentTypeControllers::class, 'handleDeleteFieldFromContentType', 'deleteField:contentTypes']
        );
        $ctx->router->map('POST', '/api/content-types',
            [ContentTypeControllers::class, 'handleCreateContentType', 'create:contentTypes']
        );
        $ctx->router->map('GET', '/api/content-types/[no-internals:filter]?',
            [ContentTypeControllers::class, 'handleGetContentTypes', 'view:contentTypes']
        );
        $ctx->router->map('GET', '/api/content-types/[w:name]',
            [ContentTypeControllers::class, 'handleGetContentType', 'view:contentTypes']
        );
        $ctx->router->map('PUT', '/api/content-types/[w:contentTypeName]/reorder-fields',
            [ContentTypeControllers::class, 'handleUpdateOrderOfContentTypeFields', 'updateField:contentTypes']
        );
        $ctx->router->map('PUT', '/api/content-types/[w:contentTypeName]',
            [ContentTypeControllers::class, 'handleUpdateBasicInfoOfContentType', 'update:contentTypes']
        );
        $ctx->router->map('DELETE', '/api/content-types/[w:contentTypeName]',
            [ContentTypeControllers::class, 'handleDeleteContentType', 'delete:contentTypes']
        );
    }
}

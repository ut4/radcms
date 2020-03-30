<?php

declare(strict_types=1);

namespace RadCms\Content;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content -alkuiset http-reitit.
     *
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\CmsState cmsState, \Pike\Translator translator}
     */
    public static function init(\stdClass $ctx): void {
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
        $ctx->router->map('DELETE', '/api/content/[i:id]/[w:contentTypeName]',
            [ContentControllers::class, 'handleDeleteContentNode', 'delete:content']
        );
    }
}

<?php

namespace RadCms\ContentType;

abstract class ContentTypeModule {
    /**
     * Rekisteröi /api/content-types -alkuiset http-reitit.
     *
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\CmsState cmsState, \Pike\Translator translator}
     */
    public static function init($ctx) {
        $ctx->router->map('POST', '/api/content-types/field/[w:contentTypeName]',
            [ContentTypeControllers::class, 'handleAddFieldToContentType', 'addField:contentTypes']
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
    }
}

<?php

namespace RadCms\ContentType;

abstract class ContentTypeModule {
    /**
     * Rekisteröi /api/content-types -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/content-types/[no-internals:filter]?',
            [ContentTypeControllers::class, 'handleGetContentTypes', true]
        );
        $ctx->router->map('GET', '/api/content-types/[w:name]',
            [ContentTypeControllers::class, 'handleGetContentType', true]
        );
    }
}

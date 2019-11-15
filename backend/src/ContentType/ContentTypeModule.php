<?php

namespace RadCms\ContentType;

abstract class ContentTypeModule {
    /**
     * Rekisteröi /api/content-types -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/content-types/[w:name]', function () {
            return [ContentTypeControllers::class, 'handleGetContentType', true];
        });
        $ctx->router->map('GET', '/api/content-types', function () {
            return [ContentTypeControllers::class, 'handleGetAllContentTypes', true];
        });
    }
}

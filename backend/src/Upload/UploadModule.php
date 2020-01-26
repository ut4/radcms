<?php

namespace RadCms\Upload;

abstract class UploadModule {
    /**
     * Rekisteröi /api/uploads -alkuiset http-reitit.
     *
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/uploads',
            [UploadControllers::class, 'handleGetUploads', true]
        );
        $ctx->router->map('POST', '/api/uploads',
            [UploadControllers::class, 'handleUploadFile', true]
        );
    }
}

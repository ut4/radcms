<?php

declare(strict_types=1);

namespace RadCms\Upload;

use RadCms\AppContext;

abstract class UploadModule {
    /**
     * Rekisteröi /api/uploads -alkuiset http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/api/uploads/[*:filters]?',
            [UploadControllers::class, 'getUploads', 'view:uploads:']
        );
        $ctx->router->map('POST', '/api/uploads',
            [UploadControllers::class, 'uploadFile', 'upload:uploads:multiPart']
        );
        $ctx->router->map('PUT', '/api/uploads/rebuild-index',
            [UploadControllers::class, 'rebuildIndex', 'rebuildIndex:uploads:json']
        );
    }
}

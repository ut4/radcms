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
        $ctx->router->map('GET', '/api/uploads',
            [UploadControllers::class, 'handleGetUploads', 'view:uploads']
        );
        $ctx->router->map('POST', '/api/uploads',
            [UploadControllers::class, 'handleUploadFile', 'upload:uploads']
        );
    }
}

<?php

namespace RadCms\Upload;

use Pike\Response;

/**
 * Handlaa /api/uploads -alkuiset pyynnöt.
 */
class UploadControllers {
    /**
     * GET /api/uploads.
     *
     * @param \Pike\Response $res
     */
    public function handleGetUploads(Response $res, UploadFileScanner $scanner) {
        // @allow \Pike\PikeException
        $files = $scanner->scanAll(RAD_SITE_PATH . 'uploads');
        $res->json($files);
    }
}

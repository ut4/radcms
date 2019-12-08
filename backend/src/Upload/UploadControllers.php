<?php

namespace RadCms\Upload;

use RadCms\Framework\Response;

/**
 * Handlaa /api/uploads -alkuiset pyynnöt.
 */
class UploadControllers {
    /**
     * GET /api/uploads.
     *
     * @param \RadCms\Framework\Response $res
     */
    public function handleGetAllUploads(Response $res, UploadFileScanner $scanner) {
        // @allow \RadCms\Common\RadException
        $files = $scanner->scanAll(RAD_SITE_PATH . 'uploads');
        $res->json($files);
    }
}

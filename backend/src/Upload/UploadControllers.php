<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\Request;
use Pike\Response;
use Pike\Validation;
use Pike\PikeException;

/**
 * Handlaa /api/uploads -alkuiset pyynnöt.
 */
class UploadControllers {
    private const UPLOADS_DIR_PATH = RAD_PUBLIC_PATH . 'uploads';
    /**
     * GET /api/uploads.
     *
     * @param \Pike\Response $res
     * @param \RadCms\Upload\UploadFileScanner $scanner
     */
    public function handleGetUploads(Response $res,
                                     UploadFileScanner $scanner): void {
        // @allow \Pike\PikeException
        $files = $scanner->scanAll(self::UPLOADS_DIR_PATH);
        $res->json($files);
    }
    /**
     * POST /api/uploads.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Upload\Uploader $uploader
     */
    public function handleUploadFile(Request $req,
                                     Response $res,
                                     Uploader $uploader): void {
        if (isset($req->files->localFile['error']) &&
            $req->files->localFile['error'] !== UPLOAD_ERR_OK) {
            throw new PikeException('Expected UPLOAD_ERR_OK (0), but got ' .
                                    $req->files->localFile['error'],
                                    PikeException::FAILED_FS_OP);
        } elseif (($errors = $this->validateUploadInput($req))) {
            $res->status(400)->json(implode('\n', $errors));
            return;
        }
        // @allow \Pike\PikeException
        $file = $uploader->upload($req->files->localFile, self::UPLOADS_DIR_PATH);
        $res->json(['file' => $file]);
    }
    /**
     * @return string[]
     */
    private function validateUploadInput($req): array {
        return (Validation::makeObjectValidator())
            ->rule('files.localFile', 'type', 'array')
            ->validate($req);
    }
}

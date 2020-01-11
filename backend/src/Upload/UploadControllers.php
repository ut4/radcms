<?php

namespace RadCms\Upload;

use Pike\Request;
use Pike\Response;
use Pike\Validator;
use Pike\PikeException;

/**
 * Handlaa /api/uploads -alkuiset pyynnöt.
 */
class UploadControllers {
    private const UPLOADS_DIR_PATH = RAD_SITE_PATH . 'uploads';
    /**
     * GET /api/uploads.
     *
     * @param \Pike\Response $res
     * @param \RadCms\Upload\UploadFileScanner $scanner
     */
    public function handleGetUploads(Response $res, UploadFileScanner $scanner) {
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
                                     Uploader $uploader) {
        if (isset($req->files->localFile['error']) &&
            $req->files->localFile['error'] !== UPLOAD_ERR_OK) {
            throw new PikeException('Expected UPLOAD_ERR_OK (0), but got ' .
                                    $req->files->localFile['error'],
                                    PikeException::FAILED_FS_OP);
        } elseif (($errors = $this->validateUploadInput($req))) {
            $res->html(implode('\n', $errors));
            return;
        }
        // @allow \Pike\PikeException
        $uploader->upload($req->files->localFile, self::UPLOADS_DIR_PATH);
        $res->redirect($req->body->returnTo);
    }
    /**
     * @return string[]
     */
    private function validateUploadInput($req) {
        $v1 = new Validator($req->body);
        $v1->check('returnTo', 'nonEmptyString');
        $v2 = new Validator($req->files);
        $v2->check('localFile', 'present');
        return array_merge($v1->errors, $v2->errors);
    }
}

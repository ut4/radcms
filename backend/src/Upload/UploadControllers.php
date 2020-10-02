<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\{PikeException, Request, Response, Validation};

/**
 * Handlaa /api/uploads -alkuiset pyynnöt.
 */
class UploadControllers {
    private const UPLOADS_DIR_PATH = RAD_PUBLIC_PATH . 'uploads';
    /**
     * GET /api/uploads/:filters?: palauttaa filttereitä vastaavat tietokantaan
     * synkatut tiedostot.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Upload\UploadsRepository $uploadsRepo
     */
    public function getUploads(Request $req,
                               Response $res,
                               UploadsRepository $uploadsRepo): void {
        $filterType = $req->params->filters ?? '';
        // @allow \Pike\PikeException
        $files = $uploadsRepo->getMany($filterType === 'images'
            ? UploadsQFilters::byMime('image/*')
            : null);
        $res->json($files);
    }
    /**
     * POST /api/uploads: validoi sisääntulevan tiedoston $_FILES['localFile'],
     * siirtää sen uploads-kansioon, ja insertoi sen tiedot tietokantaan.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Upload\Uploader $uploader
     * @param \RadCms\Upload\UploadsRepository $uploadsRepo
     */
    public function uploadFile(Request $req,
                               Response $res,
                               Uploader $uploader,
                               UploadsRepository $uploadsRepo): void {
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
        // @allow \Pike\PikeException
        $file->createdAt = time();
        $uploadsRepo->insertMany([$file]);
        //
        $res->json(['file' => $file]);
    }
    /**
     * PUT /api/uploads/rebuild-index: synkronoi uploads-kansion tämänhetkisen
     * sisällön tietokantaan.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Upload\UploadFileScanner $scanner
     * @param \RadCms\Upload\UploadsRepository $uploadsRepo
     */
    public function rebuildIndex(Request $req,
                                 Response $res,
                                 UploadFileScanner $scanner,
                                 UploadsRepository $uploadsRepo): void {
        if (($req->body->areYouSure ?? '') !== 'yes, reduild everything')
            throw new PikeException('Invalid request',
                                    PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $files = $scanner->scanAll(self::UPLOADS_DIR_PATH);
        foreach ($files as $file) {
            if (!UploadFileScanner::isImage($file->mime)) {
                $res->status(400)->json(['validationErrors' => [
                    "mime `{$file->mime}` ({$file->fileName}) is forbidden"
                ]]);
                return;
            }
            // @allow \Pike\PikeException
            $info = self::stat("{$file->basePath}{$file->fileName}");
            $file->createdAt = $info['ctime'];
            $file->updatedAt = $info['mtime'];
        }
        // @allow \Pike\PikeException
        $uploadsRepo->deleteAll();
        // @allow \Pike\PikeException
        $numAffectedRows = $uploadsRepo->insertMany($files);
        //
        $res->json(['ok' => 'ok', 'numChanges' => $numAffectedRows]);
    }
    /**
     * @param string $filePath Tiedoston absoluuttinen polku
     * @return array
     * @throws \Pike\PikeException
     */
    private static function stat(string $filePath): array {
        if (($info = stat($filePath)) === false)
            throw new PikeException('stat() failed', PikeException::FAILED_FS_OP);
        return $info;
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

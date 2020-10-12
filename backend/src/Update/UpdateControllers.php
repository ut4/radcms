<?php

declare(strict_types=1);

namespace RadCms\Update;

use Pike\{PikeException, Request, Response, Validation};
use Pike\Interfaces\FileSystemInterface;
use RadCms\FileMigrator;
use RadCms\Packager\PackageUtils;

/**
 * Handlaa /api/updates -alkuiset pyynnöt.
 */
class UpdateControllers {
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var string */
    private $backendDirPath;
    /**
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param string $backendDirPath = RAD_BACKEND_PATH
     */
    public function __construct(FileSystemInterface $fs,
                                string $backendDirPath = RAD_BACKEND_PATH) {
        $this->fs = $fs;
        $this->backendDirPath = $backendDirPath;
    }
    /**
     * GET /api/updates: palauttaa backend-kansiosta löytyneiden .update-tiedos-
     * tojen nimet tai [].
     *
     * @param \Pike\Response $res
     */
    public function getUpdatePackagesFromServer(Response $res): void {
        // @allow \Pike\PikeException
        $filePaths = $this->findUpdateFiles();
        $res->json($filePaths);
    }
    /**
     * PUT /api/updates: Asentaa ensimmäisen backend-kansiosta löytyneen .update-
     * paketin.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Update\UpdateInstaller $updater 
     */
    public function updateCms(Request $req,
                              Response $res,
                              UpdateInstaller $updater): void {
        if (!($paths = $this->findUpdateFiles()))
            throw new PikeException('Invalid request',
                                    PikeException::BAD_INPUT);
        if (($errors = $this->validateUpdateCmsInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            $updater->applyUpdate(RAD_BACKEND_PATH . $paths[0],
                                  $req->body->unlockKey);
        } catch (PikeException $e) {
            if ($e->getMessage() === 'Failed to decrypt input string') {
                $res->json(['knownError' => 'invalidUnlockKey']);
                return;
            }
            throw $e;
        }
        $res->json(['ok' => 'ok']);
    }
    /**
     * @return string Backend-kansiosta löytyneiden .update-tiedostojen nimet ('<merkkijono>.update'), tai []
     */
    private function findUpdateFiles(): array {
        $paths = $this->fs->readDir($this->backendDirPath, '*.update');
        return array_map(FileMigrator::makeRelatifier($this->backendDirPath), $paths);
    }
    /**
     * @return string[]
     */
    private function validateUpdateCmsInput(\stdClass $reqBody): array {
        return Validation::makeObjectValidator()
            ->rule('unlockKey', 'minLength', PackageUtils::MIN_SIGNING_KEY_LEN)
            ->validate($reqBody);
    }
}

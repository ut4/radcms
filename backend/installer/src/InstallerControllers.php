<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\Request;
use Pike\Response;
use Pike\Template;
use Pike\Validation;
use Pike\FileSystem;
use Pike\FileSystemInterface;
use Pike\PikeException;

class InstallerControllers {
    /** @var string $siteDirPath */
    private $siteDirPath;
    /** @var \Pike\FileSystemInterface $fs */
    private $fs;
    /**
     * @param \Pike\FileSystemInterface $fs
     * @param string $indexDirPath = INDEX_DIR_PATH
     */
    public function __construct(FileSystemInterface $fs,
                                string $indexDirPath = INDEX_DIR_PATH) {
        $this->siteDirPath = FileSystem::normalizePath($indexDirPath) . '/';
        $this->fs = $fs;
    }
    /**
     * GET /.
     *
     * @param \Pike\Response $res
     */
    public function renderHomeView(Response $res): void {
        if (!defined('INDEX_DIR_PATH')) {
            $res->status(400)->html('Corrupt install.php (INDEX_DIR_PATH missing).');
            return;
        }
        $tmpl = new Template(__DIR__ . '/main-view.tmpl.php');
        $res->html($tmpl->render([
            'packageExists' => $this->findPackageFile() !== null
        ]));
    }
    /**
     * POST /.
     */
    public function handleInstallRequest(Request $req,
                                         Response $res,
                                         Installer $installer): void {
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->json(json_encode($errors));
            return;
        }
        // @allow \Pike\PikeException
        $installer->doInstall($req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'warnings' => $installer->getWarnings(),
                                'siteWasInstalledTo' => $this->siteDirPath]));
    }
    /**
     * POST /from-package.
     */
    public function handleInstallFromPackageRequest(Request $req,
                                                    Response $res,
                                                    PackageInstaller $installer): void {
        if (($errors = $this->validateInstallFromPackageInput($req))) {
            $res->status(400)->json($errors);
            return;
        }
        if (!($filePath = $this->findPackageFile()))
            throw new PikeException('Bad request', PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $settings = $installer->doInstall($filePath, $req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'warnings' => $installer->getWarnings(),
                                'siteWasInstalledTo' => $this->siteDirPath,
                                'mainQueryVar' => $settings->mainQueryVar]));
    }
    /**
     * @return string[]
     */
    private function validateInstallInput(\stdClass $input): array {
        $errors = (Validation::makeObjectValidator())
            ->rule('siteName', 'type', 'string')
            ->rule('siteLang', 'in', ['en', 'fi'])
            ->rule('sampleContent', 'in', ['minimal', 'blog', 'test-content'])
            ->rule('mainQueryVar?', 'identifier')
            ->rule('useDevMode', 'type', 'bool')
            ->rule('dbHost', 'minLength', 1)
            ->rule('dbUser', 'minLength', 1)
            ->rule('dbPass', 'type', 'string')
            ->rule('dbDatabase', 'minLength', 1)
            ->rule('doCreateDb', 'type', 'bool')
            ->rule('dbTablePrefix?', 'minLength', 1)
            ->rule('dbCharset', 'in', ['utf8'])
            ->rule('firstUserName', 'minLength', 1)
            ->rule('firstUserEmail?', 'minLength', 3)
            ->rule('firstUserPass', 'type', 'string')
            ->rule('baseUrl', 'minLength', 1)
            ->validate($input);
        if (!$errors) {
            $input->siteName = mb_strlen($input->siteName) ? $input->siteName : 'My Site';
            $input->mainQueryVar = $input->mainQueryVar ?? '';
            $input->firstUserEmail = $input->firstUserEmail ?? '';
        }
        return $errors;
    }
    /**
     * @return string[]
     */
    private function validateInstallFromPackageInput(Request $req): array {
        return Validation::makeObjectValidator()
            ->rule('unlockKey', 'minLength', 12)
            ->rule('baseUrl', 'minLength', 1)
            ->validate($req->body);
    }
    /**
     * @return string Ensimmäisen serverin rootista löytyneen .radsite-tiedoston absoluuttinen polku, tai null
     */
    private function findPackageFile(): ?string {
        $files = $this->fs->readDir($this->siteDirPath, '*.radsite');
        return $files ? $files[0] : null;
    }
}

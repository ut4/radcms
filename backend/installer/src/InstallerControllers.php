<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\{PikeException, Request, Response, Template, Validation};
use Pike\Interfaces\FileSystemInterface;
use RadCms\Packager\Packager;

class InstallerControllers {
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var string */
    private $packageLocationPath;
    /**
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param string $packageLocationPath
     */
    public function __construct(FileSystemInterface $fs,
                                string $packageLocationPath = RAD_PUBLIC_PATH) {
        $this->fs = $fs;
        $this->packageLocationPath = $packageLocationPath;
    }
    /**
     * GET /.
     *
     * @param \Pike\Response $res
     */
    public function renderHomeView(Response $res): void {
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
        $workspaceDirPath = $installer->doInstall($req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'siteWasInstalledTo' => $workspaceDirPath,
                                'warnings' => $installer->getWarnings()]));
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
                                'mainQueryVar' => $settings->mainQueryVar,
                                'warnings' => $installer->getWarnings()]));
    }
    /**
     * @return string[]
     */
    private function validateInstallInput(\stdClass $input): array {
        $errors = (Validation::makeObjectValidator())
            ->rule('siteName', 'type', 'string')
            ->rule('siteLang', 'in', ['en', 'fi'])
            ->rule('sampleContent', 'in', ['minimal', 'blog', 'basic-site', 'test-content'])
            ->rule('mainQueryVar?', 'identifier')
            ->rule('useDevMode', 'type', 'bool')
            ->rule('dbHost', 'minLength', 1)
            ->rule('dbUser', 'minLength', 1)
            ->rule('dbPass', 'type', 'string')
            ->rule('dbDatabase', 'minLength', 1)
            ->rule('doCreateDb', 'type', 'bool')
            ->rule('dbTablePrefix?', 'minLength', 1)
            ->rule('dbCharset', 'in', ['utf8mb4', 'utf8'])
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
            ->rule('unlockKey', 'minLength', Packager::MIN_SIGNING_KEY_LEN)
            ->rule('baseUrl', 'minLength', 1)
            ->validate($req->body);
    }
    /**
     * @return string Ensimmäisen serverin rootista löytyneen .radsite-tiedoston absoluuttinen polku, tai null
     */
    private function findPackageFile(): ?string {
        $files = $this->fs->readDir($this->packageLocationPath, '*.radsite');
        return $files ? $files[0] : null;
    }
}

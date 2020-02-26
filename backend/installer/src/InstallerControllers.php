<?php

namespace RadCms\Installer;

use Pike\Request;
use Pike\Response;
use Pike\Template;
use Pike\Validation;
use Pike\Auth\Crypto;
use RadCms\Packager\PlainTextPackageStream;
use Pike\FileSystem;

class InstallerControllers {
    private $installer;
    /**
     * @param \RadCms\Installer\Installer $installer
     */
    public function __construct(Installer $installer) {
        $this->installer = $installer;
    }
    /**
     * GET /.
     *
     * @param \Pike\Response $res
     */
    public function renderHomeView(Response $res) {
        if (!defined('INDEX_DIR_PATH')) {
            $res->status(400)->html('Corrupt install.php (INDEX_DIR_PATH missing).');
            return;
        }
        $template = new Template(__DIR__ . '/main-view.tmpl.php');
        $res->html($template->render(['siteDirPath' =>
            FileSystem::normalizePath(INDEX_DIR_PATH) . '/']));
    }
    /**
     * POST /.
     */
    public function handleInstallRequest(Request $req, Response $res) {
        //
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->json(json_encode($errors));
            return;
        }
        // @allow \Pike\PikeException
        $this->installer->doInstall($req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'warnings' => $this->installer->getWarnings()]));
    }
    /**
     * POST /from-package.
     */
    public function handleInstallFromPackageRequest(Request $req,
                                                    Response $res,
                                                    PlainTextPackageStream $stream,
                                                    Crypto $crypto) {
        if (($errors = $this->validateInstallFromPackageInput($req))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $this->installer
            ->doInstallFromPackage($stream,
                                   $req->files->packageFile['tmp_name'],
                                   $req->body->unlockKey,
                                   $crypto);
        $res->json(json_encode(['ok' => 'ok']));
    }
    /**
     * @return string[]
     */
    private function validateInstallInput($input) {
        $errors = (Validation::makeObjectValidator())
            ->rule('siteName?', 'type', 'string')
            ->rule('siteLang', 'in', ['en_US', 'fi_FI'])
            ->rule('sampleContent', 'in', ['minimal', 'blog', 'test-content'])
            ->rule('mainQueryVar?', 'identifier')
            ->rule('useDevMode?', 'type', 'bool')
            ->rule('dbHost', 'minLength', 1)
            ->rule('dbUser', 'minLength', 1)
            ->rule('dbPass', 'type', 'string')
            ->rule('dbDatabase', 'minLength', 1)
            ->rule('dbTablePrefix?', 'minLength', 1)
            ->rule('dbCharset', 'in', ['utf8'])
            ->rule('firstUserName', 'minLength', 1)
            ->rule('firstUserMail?', 'minLength', 3)
            ->rule('firstUserPass', 'type', 'string')
            ->rule('baseUrl', 'minLength', 1)
            ->validate($input);
        if (!$errors) {
            $input->siteName = $input->siteName ?? 'My Site';
            $input->mainQueryVar = $input->mainQueryVar ?? '';
            $input->useDevMode = ($input->useDevMode ?? null) === true;
            $input->firstUserMail = $input->firstUserMail ?? '';
        }
        return $errors;
    }
    /**
     * @return string[]
     */
    private function validateInstallFromPackageInput($req) {
        $errors = [];
        if (!$req->files->packageFile) {
            $errors[] = 'packageFile is required';
        }
        if (!$req->body->unlockKey) {
            $errors[] = 'unlockKey is required';
        } elseif (!is_string($req->body->unlockKey) ||
                  strlen($req->body->unlockKey) < 12) {
            $errors[] = 'unlockKey must be >= 12 characters long';
        }
        return $errors;
    }
}

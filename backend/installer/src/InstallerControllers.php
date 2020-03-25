<?php

namespace RadCms\Installer;

use Pike\Request;
use Pike\Response;
use Pike\Template;
use Pike\Validation;
use Pike\FileSystem;

class InstallerControllers {
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
    public function handleInstallRequest(Request $req,
                                         Response $res,
                                         Installer $installer) {
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->json(json_encode($errors));
            return;
        }
        // @allow \Pike\PikeException
        $installer->doInstall($req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'warnings' => $installer->getWarnings()]));
    }
    /**
     * POST /from-package.
     */
    public function handleInstallFromPackageRequest(Request $req,
                                                    Response $res,
                                                    PackageInstaller $installer) {
        if (($errors = $this->validateInstallFromPackageInput($req))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $installer->doInstall($req->files->packageFile['tmp_name'],
                              $req->body);
        $res->json(json_encode(['ok' => 'ok',
                                'warnings' => $installer->getWarnings()]));
    }
    /**
     * @return string[]
     */
    private function validateInstallInput($input) {
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
            ->rule('dbTablePrefix?', 'type', 'string')
            ->rule('dbTablePrefix?', 'minLength', 1)
            ->rule('dbCharset', 'in', ['utf8'])
            ->rule('firstUserName', 'minLength', 1)
            ->rule('firstUserEmail?', 'type', 'string')
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
    private function validateInstallFromPackageInput($req) {
        return array_merge(
            (Validation::makeObjectValidator())
                ->rule('unlockKey', 'type', 'string')
                ->rule('unlockKey', 'minLength', 12)
                ->validate($req->body),
            (Validation::makeObjectValidator())
                ->rule('packageFile', 'type', 'array')
                ->validate($req->files)
        );
    }
}

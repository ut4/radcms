<?php

namespace RadCms\Installer;

use Pike\Request;
use Pike\Response;
use Pike\Template;
use Pike\Validator;
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
        $v = new Validator($input);
        //
        if ($v->check('siteName', 'string'))
            if (!strlen($input->siteName)) $input->siteName = 'My Site';
        $v->check('siteLang', ['in', ['en_US', 'fi_FI']]);
        $v->check('sampleContent', ['in', ['minimal', 'blog', 'test-content']]);
        if ($v->is('mainQueryVar', 'nonEmptyString')) $v->check('mainQueryVar', 'word');
        else $v->check('mainQueryVar', 'string');
        $v->check('useDevMode', 'present');
        //
        $v->check('dbHost', 'nonEmptyString');
        $v->check('dbUser', 'nonEmptyString');
        $v->check('dbPass', 'nonEmptyString');
        $v->check('dbDatabase', 'nonEmptyString');
        $v->check('dbTablePrefix', 'nonEmptyString');
        $v->check('dbCharset', ['in', ['utf8']]);
        //
        $v->check('firstUserName', 'nonEmptyString');
        if ($v->is('firstUserEmail', 'present'))
            $v->check('firstUserEmail', 'string');
        $v->check('firstUserPass', 'nonEmptyString');
        //
        $v->check('baseUrl', 'nonEmptyString');
        //
        return $v->errors;
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

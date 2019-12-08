<?php

namespace RadCms\Installer;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;
use RadCms\Framework\Validator;
use RadCms\Framework\Template;
use RadCms\Common\RadException;
use RadCms\Common\LoggerAccess;
use RadCms\Packager\PlainTextPackageStream;
use RadCms\Auth\Crypto;

class InstallerControllers {
    private $indexFilePath;
    private $fs;
    private $crypto;
    private $makeDb;
    private $makeStream;
    /**
     * @param string $indexFilePath ks. InstallerApp::__construct
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param \RadCms\Auth\Crypto $crypto = null
     * @param callable $makeDb = null
     * @param \Closure $makePackageStream = null
     */
    public function __construct($indexFilePath,
                                FileSystemInterface $fs = null,
                                Crypto $crypto = null,
                                $makeDb = null,
                                $makePackageStream = null) {
        $this->indexFilePath = $indexFilePath;
        $this->fs = $fs ?? new FileSystem();
        $this->crypto = $crypto ?? new Crypto();
        $this->makeDb = $makeDb;
        $this->makeStream = $makePackageStream ?? function () {
            return new PlainTextPackageStream();
        };
    }
    /**
     * GET /.
     *
     * @param \RadCms\Framework\Request $_
     * @param \RadCms\Framework\Response $res
     */
    public function renderHomeView(Request $_, Response $res) {
        $template = new Template(__DIR__ . '/main-view.tmpl.php');
        $res->html($template->render(['indexFilePath' => $this->indexFilePath]));
    }
    /**
     * POST /.
     */
    public function handleInstallRequest(Request $req, Response $res) {
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->json(json_encode($errors));
            return;
        }
        try {
            (new Installer($this->indexFilePath, $this->fs, $this->makeDb))
                ->doInstall($req->body);
            $res->json(json_encode(['ok' => 'ok']));
        } catch (RadException $e) {
            LoggerAccess::getLogger()->log('error', $e->getTraceAsString());
            $res->status($e->getCode() !== RadException::BAD_INPUT ? 500 : 400)
                ->json(json_encode(['error' => $e->getCode()]));
        }
    }
    /**
     * POST /from-package.
     */
    public function handleInstallFromPackageRequest(Request $req, Response $res) {
        if (($errors = $this->validateInstallFromPackageInput($req))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            (new Installer($this->indexFilePath, $this->fs, $this->makeDb))
                ->doInstallFromPackage($this->makeStream->__invoke(),
                                       $req->files->packageFile['tmp_name'],
                                       $req->body->unlockKey,
                                       $this->crypto);
            $res->json(json_encode(['ok' => 'ok']));
        } catch (RadException $e) {
            LoggerAccess::getLogger()->log('error', $e->getTraceAsString());
            $res->status($e->getCode() !== RadException::BAD_INPUT ? 500 : 400)
                ->json(json_encode(['error' => $e->getCode()]));
        }
    }
    /**
     * @return string[]
     */
    private function validateInstallInput(&$input) {
        $v = new Validator($input);
        //
        if ($v->check('siteName', 'string'))
            if (!strlen($input->siteName)) $input->siteName = 'My Site';
        $v->check('siteLang', ['in', ['en_US', 'fi_FI']]);
        if ($v->check('baseUrl', 'nonEmptyString'))
            $input->baseUrl = rtrim($input->baseUrl, '/') . '/';
        $v->check('radPath', 'nonEmptyString', [
            function ($input, $_key) {
                $input->radPath = rtrim($input->radPath, '/') . '/';
                return $this->fs->isFile($input->radPath . 'src/Framework/Db.php');
            }, '%s is not valid sourcedir'
        ]);
        if ($v->check('sitePath', 'nonEmptyString'))
            $input->sitePath = rtrim($input->sitePath, '/') . '/';
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

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
use RadCms\Packager\ZipPackageStream;

class InstallerControllers {
    private $indexFilePath;
    private $fs;
    private $makeDb;
    private $makeStream;
    /**
     * @param string $indexFilePath ks. InstallerApp::__construct
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param callable $makeDb = null
     * @param \Closure $makePackageStream = null
     */
    public function __construct($indexFilePath,
                                FileSystemInterface $fs = null,
                                $makeDb = null,
                                $makePackageStream = null) {
        $this->indexFilePath = $indexFilePath;
        $this->fs = $fs ?? new FileSystem();
        $this->makeDb = $makeDb;
        $this->makeStream = $makePackageStream ?? function () {
            return new ZipPackageStream($this->fs);
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
            $res->status($e->getCode() != RadException::BAD_INPUT ? 500 : 400)
                ->json(json_encode(['error' => $e->getCode()]));
        }
    }
    /**
     * POST /from-package.
     */
    public function handleInstallFromPackageRequest(Request $req, Response $res) {
        if (!$req->files->packageFile) {
            $res->status(400)->json(['packageFile is required']);
            return;
        }
        try {
            (new Installer($this->indexFilePath, $this->fs, $this->makeDb))
                ->doInstallFromPackage($this->makeStream->__invoke(),
                                       $req->files->packageFile['tmp_name']);
            $res->json(json_encode(['ok' => 'ok']));
        } catch (RadException $e) {
            LoggerAccess::getLogger()->log('error', $e->getTraceAsString());
            $res->status($e->getCode() != RadException::BAD_INPUT ? 500 : 400)
                ->json(json_encode(['error' => $e->getCode()]));
        }
    }
    /**
     * Validoi POST / input-datan, ja palauttaa virheet taulukkona.
     *
     * @return array ['jokinVirhe'] tai []
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
}

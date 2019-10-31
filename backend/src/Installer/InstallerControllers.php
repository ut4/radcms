<?php

namespace RadCms\Installer;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\FileSystemInterface;
use RadCms\Framework\FileSystem;
use RadCms\Framework\Validator;
use RadCms\Framework\Template;

class InstallerControllers {
    private $sitePath;
    private $fs;
    private $makeDb;
    /**
     * @param string $sitePath ks. InstallerApp::__construct
     * @param \RadCms\Framework\FileSystemInterface $fs = null
     * @param callable $makeDb = null
     */
    public function __construct($sitePath,
                                FileSystemInterface $fs = null,
                                $makeDb = null) {
        $this->sitePath = $sitePath;
        $this->fs = $fs ?? new FileSystem();
        $this->makeDb = $makeDb;
    }
    /**
     * GET /.
     *
     * @param \RadCms\Framework\Request $_
     * @param \RadCms\Framework\Response $res
     */
    public function renderHomeView(Request $_, Response $res) {
        $template = new Template(__DIR__ . '/main-view.tmpl.php');
        $res->html($template->render(['sitePath' => $this->sitePath]));
    }
    /**
     * POST /.
     */
    public function handleInstallRequest(Request $req, Response $res) {
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->json(json_encode($errors));
            return;
        }
        $result = (new Installer($this->sitePath, $this->fs, $this->makeDb))->doInstall($req->body);
        $res->status($result == 'ok' ? 200 : 500)
            ->json(json_encode([($result == 'ok' ? 'ok' : 'error') => $result]));
    }
    /**
     * Validoi POST / input-datan, ja palauttaa virheet taulukkona.
     *
     * @return array ['jokinVirhe'] tai []
     */
    private function validateInstallInput(&$input) {
        $v = new Validator($input);
        //
        if (!$v->is('siteName', 'present')) $input->siteName = 'My Site';
        if ($v->check('baseUrl', 'present')) $input->baseUrl = rtrim($input->baseUrl, '/') . '/';
        if (!$v->is('mainQueryVar', 'present')) $input->mainQueryVar = '';
        else $v->check('mainQueryVar', 'word');
        $v->check('radPath', 'present', [
            function ($input, $_key) {
                $input->radPath = rtrim($input->radPath, '/') . '/';
                return $this->fs->isFile($input->radPath . 'src/Framework/Db.php');
            }, '%s !srcDir'
        ]);
        $v->check('sampleContent', ['in', ['minimal', 'blog', 'test-content']]);
        $v->check('dbHost', 'present');
        $v->check('dbUser', 'present');
        $v->check('dbPass', 'present');
        $v->check('dbDatabase', 'present');
        $v->check('dbTablePrefix', 'present');
        if (!$v->is('dbCharset', 'present')) $input->dbCharset = 'utf8';
        else $v->check('dbCharset', ['in', ['utf8']]);
        //
        return $v->errors;
    }
}

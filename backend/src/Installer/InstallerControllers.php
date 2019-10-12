<?php

namespace RadCms\Installer;

use RadCms\Request;
use RadCms\Response;
use RadCms\Templating\Template;
use RadCms\Common\FileSystemInterface;
use RadCms\Common\FileSystem;
use RadCms\Framework\Validator;

class InstallerControllers {
    private $sitePath;
    private $fs;
    /**
     * @param string $sitePath ks. InstallerApp::__construct
     * @param \RadCms\Common\FileSystemInterface $fs = null
     */
    public function __construct($sitePath, FileSystemInterface $fs = null) {
        $this->sitePath = $sitePath;
        $this->fs = $fs ?: new FileSystem();
    }
    /**
     * GET /.
     *
     * @param Request $_
     * @param Response $res
     */
    public function renderHomeView(Request $_, Response $res) {
        $template = new Template(__DIR__ . '/main-view.tmpl.php');
        $res->send($template->render(['sitePath' => $this->sitePath]));
    }
    /**
     * POST /.
     */
    public function handleInstallRequest(Request $req, Response $res) {
        if (($errors = $this->validateInstallInput($req->body))) {
            $res->status(400)->send(json_encode($errors));
            return;
        }
        $result = (new Installer())->doInstall($req->body);
        $res->status($result == 'ok' ? 200 : 500)
            ->send(json_encode([($result == 'ok' ? 'ok' : 'error') => $result]));
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
        $v->check('radPath', 'present', [
            function ($input, $_key) {
                $input->radPath = rtrim($input->radPath, '/') . '/';
                return $this->fs->isFile($input->radPath . 'src/Common/Db.php');
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

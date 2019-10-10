<?php

namespace RadCms\Installer;

use RadCms\Request;
use RadCms\Response;
use RadCms\Templating\Template;

class InstallerControllers {
    private $sitePath;
    /**
     * @param string $sitePath ks. InstallerApp::__construct
     */
    public function __construct($sitePath) {
        $this->sitePath = $sitePath;
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
    private function validateInstallInput($input) {
        return null;
    }
}

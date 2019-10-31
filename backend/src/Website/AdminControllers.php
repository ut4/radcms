<?php

namespace RadCms\Website;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\Template;
use RadCms\Framework\SessionInterface;

class AdminControllers {
    /**
     * GET /cpanel/:dataKey.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\Framework\SessionInterface $sess
     */
    public function handleRenderCpanelRequest(Request $req,
                                              Response $res,
                                              SessionInterface $sess) {
        $sess->start();
        $res->html((new Template(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php'))
            ->render($sess->get($req->params->dataKey)));
    }
}

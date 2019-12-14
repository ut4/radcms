<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\Templating\MagicTemplate;
use Pike\SessionInterface;

class AdminControllers {
    /**
     * GET /cpanel/:dataKey.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \Pike\SessionInterface $sess
     */
    public function handleRenderCpanelRequest(Request $req,
                                              Response $res,
                                              SessionInterface $sess) {
        if ($data = $sess->get($req->params->dataKey))
            $sess->remove($req->params->dataKey);
        $res->html((new MagicTemplate(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php'))
            ->render($data));
    }
}

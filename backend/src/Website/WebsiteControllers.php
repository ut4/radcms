<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Request;
use RadCms\Response;
use RadCms\Templating\Template;
use RadCms\Content\DAO as ContentNodeDAO;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $layoutLookup;
    private $cnd;
    /**
     * @param \RadCms\LayoutLookup $layoutLookup
     * @param \RadCms\Content\DAO $cnd
     */
    public function __construct(LayoutLookup $layoutLookup,
                                ContentNodeDAO $cnd) {
        $this->layoutLookup = $layoutLookup;
        $this->cnd = $cnd;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \RadCms\Request $request
     * @param \RadCms\Response $response
     */
    public function handlePageRequest(Request $req, Response $res) {
        $layout = $this->layoutLookup->findLayoutFor($req->path);
        if (!$layout) {
            return $res->send('404');
        }
        $template = new Template(RAD_SITE_PATH . $layout, ['contentNodeDao' => $this->cnd]);
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : ['']]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
            $dataToFrontend = [
                'page' => ['url' => $req->path],
                'panels' => $this->cnd->getFrontendPanelInfos(),
                'baseUrl' => RAD_BASE_URL,
            ];
            $html = substr($html, 0, $bodyEnd) . '<iframe src="frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' . json_encode($dataToFrontend) . ';}</script>' . substr($html, $bodyEnd);
        }
        $res->send($html);
    }
}

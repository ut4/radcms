<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Request;
use RadCms\Response;
use RadCms\Templating\Template;
use RadCms\Content\DAO as ContentNodeDAO;
use RadCms\Common\Db;

class WebsiteControllers {
    private $layoutLookup;
    private $db;
    /**
     * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
     *
     * @param RadCms\LayoutLookup $layoutLookup
     * @param RadCms\Common\Db $db
     */
    public function __construct(LayoutLookup $layoutLookup, Db $db) {
        $this->layoutLookup = $layoutLookup;
        $this->db = $db;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param Request $request
     * @param Response $response
     */
    public function handlePageRequest(Request $req, Response $res) {
        $layout = $this->layoutLookup->findLayoutFor($req->path);
        if (!$layout) {
            return $res->send('404');
        }
        $cd = new ContentNodeDAO($this->db);
        $template = new Template(RAD_SITE_PATH . $layout, ['contentNodeDao' => $cd]);
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : ['']]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
            $dataToFrontend = [
                'page' => ['url' => $req->path],
                'panels' => $cd->getFrontendPanelInfos(),
            ];
            $html = substr($html, 0, $bodyEnd) . '<iframe src="frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' . json_encode($dataToFrontend) . ';}</script>' . substr($html, $bodyEnd);
        }
        $res->send($html);
    }
}

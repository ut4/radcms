<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Request;
use RadCms\Response;
use RadCms\Templating\Template;
use RadCms\Content\DAO as ContentNodeDAO;

class WebsiteControllers {
    private $layoutLookup;
    private $cnd;
    /**
     * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
     *
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
     * @param Request $request
     * @param Response $response
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
            ];
            $html = substr($html, 0, $bodyEnd) . '<iframe src="frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' . json_encode($dataToFrontend) . ';}</script>' .
'<pre style="position: fixed; bottom: 0px; right: 13px;">Time:  '.
round((microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']) * 1000, 2). ' ms'. PHP_EOL.
'Memory: '. round(memory_get_usage() / 1024, 2). ' kb'.PHP_EOL.
'</pre>'. substr($html, $bodyEnd);
        }
        $res->send($html);
    }
}

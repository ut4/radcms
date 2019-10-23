<?php

namespace RadCms\Website;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\DAO as ContentNodeDAO;
use RadCms\Framework\SessionInterface;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $layoutLookup;
    private $cnd;
    private $session;
    private $frontendJsFiles;
    /**
     * @param \RadCms\Website\LayoutLookup $layoutLookup
     * @param \RadCms\Content\DAO $cnd
     * @param array $frontendJsFiles Array<string>
     */
    public function __construct(LayoutLookup $layoutLookup,
                                ContentNodeDAO $cnd,
                                SessionInterface $session,
                                $frontendJsFiles) {
        $this->layoutLookup = $layoutLookup;
        $this->cnd = $cnd;
        $this->session = $session;
        $this->frontendJsFiles = $frontendJsFiles;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \RadCms\Framework\Request $request
     * @param \RadCms\Framework\Response $response
     */
    public function handlePageRequest(Request $req, Response $res) {
        $layout = $this->layoutLookup->findLayoutFor($req->path);
        if (!$layout) {
            $res->send('404');
            return;
        }
        $template = new MagicTemplate(RAD_SITE_PATH . $layout, null, $this->cnd);
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : ['']]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
            $frontendDataKey = strval(time());
            $this->session->put($frontendDataKey, [
                'dataToFrontend' => [
                    'page' => ['url' => $req->path],
                    'panels' => $this->cnd->getFrontendPanelInfos(),
                    'baseUrl' => $template->url('/'),
                ],
                'pluginJsFiles' => $this->frontendJsFiles,
            ]);
            $this->session->commit();
            $html = substr($html, 0, $bodyEnd) . '<iframe src="' . $template->url('/cpanel/' . $frontendDataKey) . '" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}</script>' . substr($html, $bodyEnd);
        }
        $res->send($html);
    }
}

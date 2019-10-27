<?php

namespace RadCms\Website;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\DAO as ContentNodeDAO;
use RadCms\Framework\SessionInterface;
use RadCms\AppState;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $urlMatchers;
    private $cnd;
    private $session;
    private $pluginJsFiles;
    /**
     * @param \RadCms\Content\DAO $cnd
     * @param \RadCms\Framework\SessionInterface $session
     */
    public function __construct(SiteConfig $siteConfig,
                                AppState $appState,
                                ContentNodeDAO $cnd,
                                SessionInterface $session) {
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.ini');
        if ($siteConfig->lastModTime > $appState->contentTypesLastUpdated)
            $appState->diffAndSaveChangesToDb($siteConfig->contentTypes);
        $this->urlMatchers = $siteConfig->urlMatchers;
        $this->cnd = $cnd;
        $this->session = $session;
        $this->pluginJsFiles = $appState->pluginJsFiles;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \RadCms\Framework\Request $request
     * @param \RadCms\Framework\Response $response
     */
    public function handlePageRequest(Request $req, Response $res) {
        $layoutFileName = $this->urlMatchers->findLayoutFor($req->path);
        if (!$layoutFileName) {
            $res->send('404');
            return;
        }
        $template = new MagicTemplate(RAD_SITE_PATH . $layoutFileName, null, $this->cnd);
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : ['']]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
            $frontendDataKey = strval(time());
            $this->session->put($frontendDataKey, [
                'dataToFrontend' => [
                    'page' => ['url' => $req->path],
                    'panels' => $this->cnd->getFrontendPanelInfos(),
                    'baseUrl' => $template->url('/'),
                ],
                'pluginJsFiles' => $this->pluginJsFiles,
            ]);
            $this->session->commit();
            $html = substr($html, 0, $bodyEnd) . '<iframe src="' . $template->url('/cpanel/' . $frontendDataKey) . '" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}</script>' . substr($html, $bodyEnd);
        }
        $res->send($html);
    }
}

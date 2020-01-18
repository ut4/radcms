<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\MagicTemplateDAO as ContentNodeDAO;
use RadCms\AppState;
use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;
use Pike\FileSystem;
use Pike\PikeException;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $siteCfg;
    private $appState;
    /**
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\AppState $appState
     */
    public function __construct(SiteConfig $siteConfig, AppState $appState) {
        // @allow \Pike\PikeException
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.json');
        $this->siteCfg = $siteConfig;
        $this->appState = $appState;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \Pike\Request $request
     * @param \Pike\Response $response
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @throws \Pike\PikeException
     */
    public function handlePageRequest(Request $req,
                                      Response $res,
                                      Db $db,
                                      ContentTypeCollection $contentTypes,
                                      FileSystem $fs) {
        $layoutFileName = $this->siteCfg->urlMatchers->findLayoutFor($req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $cnd = new ContentNodeDAO($db, $contentTypes, isset($req->user));
        $template = new MagicTemplate(RAD_SITE_PATH . $layoutFileName,
                                      ['_cssFiles' => $this->siteCfg->cssAssets,
                                       '_jsFiles' => $this->siteCfg->jsAssets],
                                      $cnd,
                                      $fs);
        try {
            $url = $req->path ? explode('/', ltrim($req->path, '/')) : [''];
            $html = $template->render(['url' => $url,
                                       'site' => $this->appState->websiteState]);
        } catch (PikeException $e) {
            if (!(RAD_FLAGS & RAD_DEVMODE)) {
                $res->html("Hmm, {$layoutFileName} teki jotain odottamatonta.");
                return;
            } else {
                throw $e;
            }
        }
        $res->html(!$req->user || ($bodyEnd = strpos($html, '</body>')) === false
            ? $html
            : $this->injectParentWindowCpanelSetupScript($html, $bodyEnd, $cnd, $template, $req));
    }
    /**
     * '<html>...</body>' -> '<html>...<script>...</script></body>'
     */
    private function injectParentWindowCpanelSetupScript($html, $bodyEnd, $cnd, $template, $req) {
        $dataToFrontend = json_encode([
            'contentPanels' => $cnd->getFrontendPanelInfos(),
            'adminPanels' => $this->appState->pluginFrontendAdminPanelInfos,
            'baseUrl' => $template->url('/'),
            'assetBaseUrl' => $template->assetUrl('/'),
            'currentPagePath' => $req->path,
        ]);
        return substr($html, 0, $bodyEnd) .
            "<script>(function (data) {
                var s = document.createElement('style');
                s.innerHTML = '@keyframes radblink{from{background-color:rgba(0,90,255,0.18);}to{background-color:rgba(0,90,255,0.08);}}#rad-highlight-overlay{position:absolute;background-color:rgba(0,90,255,0.18);z-index:0;animation: .18s infinite alternate radblink;}';
                document.head.appendChild(s);
                //
                var editWindow = window.parent;
                if (editWindow.radCpanelApp) editWindow.radCpanelApp.setup(data);
                else editWindow.radData = data;
            }({$dataToFrontend}))</script>" .
        substr($html, $bodyEnd);
    }
}

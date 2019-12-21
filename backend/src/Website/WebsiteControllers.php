<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\MagicTemplateDAO as ContentNodeDAO;
use Pike\SessionInterface;
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
    private $session;
    private $appState;
    /**
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\AppState $appState
     * @param \Pike\SessionInterface $session
     */
    public function __construct(SiteConfig $siteConfig,
                                AppState $appState,
                                SessionInterface $session) {
        // @allow \Pike\PikeException
        if ($siteConfig->selfLoad(RAD_SITE_PATH . 'site.json') &&
            ((RAD_FLAGS & RAD_DEVMODE) &&
             $siteConfig->lastModTime > $appState->contentTypesLastUpdated)) {
            // @allow \Pike\PikeException
            $appState->diffAndSaveChangesToDb($siteConfig->contentTypes, 'site.json');
        }
        $this->siteCfg = $siteConfig;
        $this->session = $session;
        $this->appState = $appState;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \Pike\Request $request
     * @param \Pike\Response $response
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @throw \Pike\PikeException
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
            : $this->injectCpanelIframe($html, $bodyEnd, $cnd, $template, $req));
    }
    /**
     * '<html>...</body>' -> '<html>...<iframe...></iframe></body>'
     */
    private function injectCpanelIframe($html, $bodyEnd, $cnd, $template, $req) {
        $frontendDataKey = strval(time());
        $this->session->put($frontendDataKey, [
            'dataToFrontend' => [
                'contentPanels' => $cnd->getFrontendPanelInfos(),
                'adminPanels' => $this->appState->pluginFrontendAdminPanelInfos,
                'baseUrl' => $template->url('/'),
                'assetBaseUrl' => $template->assetUrl('/'),
                'currentPagePath' => $req->path,
            ],
            'pluginJsFiles' => $this->appState->pluginJsFiles,
        ]);
        $this->session->commit();
        return substr($html, 0, $bodyEnd) .
            '<iframe src="' . $template->url('/cpanel/' . $frontendDataKey) .
                '" id="rad-cpanel-iframe"></iframe>' .
            substr($html, $bodyEnd);
    }
}

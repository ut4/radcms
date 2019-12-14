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
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : [''],
                                   'site' => $this->appState->websiteState]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
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
            $html = substr($html, 0, $bodyEnd) .
                '<iframe src="' . $template->url('/cpanel/' . $frontendDataKey) .
                    '" id="rad-cpanel-iframe"></iframe>' .
                substr($html, $bodyEnd);
        }
        $res->html($html);
    }
}

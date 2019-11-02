<?php

namespace RadCms\Website;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\DAO as ContentNodeDAO;
use RadCms\Framework\SessionInterface;
use RadCms\AppState;
use RadCms\Common\LoggerAccess;
use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $urlMatchers;
    private $session;
    private $pluginJsFiles;
    /**
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\AppState $appState
     * @param \RadCms\Framework\SessionInterface $session
     */
    public function __construct(SiteConfig $siteConfig,
                                AppState $appState,
                                SessionInterface $session) {
        // @allow \RadCms\Common\RadException
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.ini');
        // @allow \RadCms\Common\RadException
        $siteConfig->validateUrlMatchers();
        if ($siteConfig->lastModTime > $appState->contentTypesLastUpdated &&
            ($err = $appState->diffAndSaveChangesToDb($siteConfig->contentTypes,
                                                      'site.ini'))) {
            LoggerAccess::getLogger()->log('error', 'Failed to sync site.ini'.
                                                    ': ' . $err);
        }
        $this->urlMatchers = $siteConfig->urlMatchers;
        $this->session = $session;
        $this->pluginJsFiles = $appState->pluginJsFiles;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \RadCms\Framework\Request $request
     * @param \RadCms\Framework\Response $response
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @throw \Radcms\Common\RadException
     */
    public function handlePageRequest(Request $req,
                                      Response $res,
                                      Db $db,
                                      ContentTypeCollection $contentTypes) {
        $layoutFileName = $this->urlMatchers->findLayoutFor($req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $cnd = new ContentNodeDAO($db, $contentTypes, $req->user);
        $template = new MagicTemplate(RAD_SITE_PATH . $layoutFileName, null, $cnd);
        $html = $template->render(['url' => $req->path ? explode('/', ltrim($req->path, '/')) : ['']]);
        if ($req->user && ($bodyEnd = strpos($html, '</body>')) > 1) {
            $frontendDataKey = strval(time());
            $this->session->put($frontendDataKey, [
                'dataToFrontend' => [
                    'page' => ['url' => $req->path],
                    'panels' => $cnd->getFrontendPanelInfos(),
                    'baseUrl' => $template->url('/'),
                ],
                'pluginJsFiles' => $this->pluginJsFiles,
            ]);
            $this->session->commit();
            $html = substr($html, 0, $bodyEnd) . '<iframe src="' . $template->url('/cpanel/' . $frontendDataKey) . '" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}</script>' . substr($html, $bodyEnd);
        }
        $res->html($html);
    }
}

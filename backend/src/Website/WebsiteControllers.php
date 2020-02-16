<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\MagicTemplateDAO as MagicTemplateContentDAO;
use RadCms\AppState;
use Pike\FileSystem;
use Pike\PikeException;
use RadCms\Theme\Theme;
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;
use RadCms\BaseAPI;
use RadCms\Auth\ACL;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $siteCfg;
    private $appState;
    private $stockContentTypes;
    /**
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\AppState $appState
     * @param \RadCms\Theme\Theme $theme
     */
    public function __construct(SiteConfig $siteConfig,
                                AppState $appState,
                                Theme $theme) {
        // @allow \Pike\PikeException
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.json', false);
        $api = new BaseAPI($appState->apiConfigs);
        // @allow \Pike\PikeException
        $theme->load($api);
        // @allow \Pike\PikeException
        $this->initStockContentTypes($api);
        $this->siteCfg = $siteConfig;
        $this->appState = $appState;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Templating\MagicTemplateDAO $dao
     * @param \Pike\FileSystem $fs
     * @param \RadCms\Auth\ACL $acl
     * @throws \Pike\PikeException
     */
    public function handlePageRequest(Request $req,
                                      Response $res,
                                      MagicTemplateContentDAO $dao,
                                      FileSystem $fs,
                                      ACL $acl) {
        $layoutFileName = $this->siteCfg->urlMatchers->findLayoutFor($req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $dao->fetchRevisions = isset($req->user);
        $template = new MagicTemplate(RAD_SITE_PATH . "theme/{$layoutFileName}",
                                      ['_cssFiles' => $this->siteCfg->cssAssets,
                                       '_jsFiles' => $this->siteCfg->jsAssets],
                                      $dao,
                                      $fs);
        $this->appState->apiConfigs->applyRegisteredTemplateStuff($template,
            'WebsiteLayout');
        try {
            $url = $req->path ? explode('/', ltrim($req->path, '/')) : [''];
            $html = $template->render(['url' => $url,
                                       'urlStr' => $req->path,
                                       'site' => $this->appState->siteInfo]);
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
            : $this->injectParentWindowCpanelSetupScript($html, $bodyEnd,
                $this->makeFrontendData($req, $dao, $template, $acl))
        );
    }
    /**
     * ...
     */
    private function initStockContentTypes($api) {
        $this->stockContentTypes[] = new MultiFieldBlobs();
        $this->stockContentTypes[0]->init($api);
    }
    /**
     * '<html>...</body>' -> '<html>...<script>...</script></body>'
     */
    private function injectParentWindowCpanelSetupScript($html,
                                                         $bodyEnd,
                                                         $dataToFrontend) {
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
    /**
     * '{"contentPanels":[...}'
     */
    private function makeFrontendData($req, $dao, $template, $acl) {
        $role = $req->user->role;
        return json_encode([
            'contentPanels' => $dao->getFrontendPanelInfos(),
            'adminPanels' => $role === ACL::ROLE_SUPER_ADMIN
                ? $this->appState->apiConfigs->getRegisteredAdminPanels()
                : [],
            'baseUrl' => $template->url('/'),
            'assetBaseUrl' => $template->assetUrl('/'),
            'currentPagePath' => $req->path,
            'user' => ['role' => $role],
            'userPermissions' => [
                'canCreateContent' => $acl->can($role, 'create', 'content'),
                'canManageFieldsOfMultiFieldContent' => $acl->can($role,
                    'manageFieldsOf', 'multiFieldContent')
            ],
        ]);
    }
}

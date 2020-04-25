<?php

declare(strict_types=1);

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\Templating\MagicTemplate;
use RadCms\Content\MagicTemplateDAO as MagicTemplateContentDAO;
use RadCms\CmsState;
use Pike\FileSystem;
use Pike\PikeException;
use RadCms\Theme\Theme;
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;
use RadCms\BaseAPI;
use RadCms\Auth\ACL;
use RadCms\Content\MagicTemplateDAO;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $siteCfg;
    private $cmsState;
    private $stockContentTypes;
    /**
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\CmsState $cmsState
     * @param \RadCms\Theme\Theme $theme
     */
    public function __construct(SiteConfig $siteConfig,
                                CmsState $cmsState,
                                Theme $theme) {
        // @allow \Pike\PikeException
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.json');
        $api = new BaseAPI($cmsState->getApiConfigs());
        // @allow \Pike\PikeException
        $theme->load($api);
        // @allow \Pike\PikeException
        $this->initStockContentTypes($api);
        $this->siteCfg = $siteConfig;
        $this->cmsState = $cmsState;
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
                                      ACL $acl): void {
        $layoutFileName = self::findLayout($this->siteCfg->urlMatchers, $req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $dao->fetchRevisions = isset($req->user);
        $template = new MagicTemplate(RAD_SITE_PATH . "site/{$layoutFileName}",
                                      ['_cssFiles' => $this->siteCfg->getCssAssets(),
                                       '_jsFiles' => $this->siteCfg->getJsAssets(SiteConfig::DOCUMENT_WEBSITE)],
                                      $dao,
                                      $fs);
        $this->cmsState->getApiConfigs()->applyRegisteredTemplateStuff($template,
            'WebsiteLayout');
        try {
            $url = $req->path ? explode('/', ltrim($req->path, '/')) : [''];
            $html = $template->render(['url' => $url,
                                       'urlStr' => $req->path,
                                       'site' => $this->cmsState->getSiteInfo()]);
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
     * @param \RadCms\Website\UrlMatcher[] $urlMatchers
     * @param string $url
     * @return string
     */
    public static function findLayout(array $urlMatchers, string $url): string {
        foreach ($urlMatchers as $rule) {
            if (preg_match($rule->pattern, $url)) return $rule->layoutFileName;
        }
        return '';
    }
    /**
     * ...
     */
    private function initStockContentTypes(BaseAPI $api): void {
        $this->stockContentTypes[] = new MultiFieldBlobs();
        $this->stockContentTypes[0]->init($api);
    }
    /**
     * '<html>...</body>' -> '<html>...<script>...</script></body>'
     */
    private function injectParentWindowCpanelSetupScript(string $html,
                                                         int $bodyEnd,
                                                         string $dataToFrontend): string {
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
    private function makeFrontendData(Request $req,
                                      MagicTemplateDAO $dao,
                                      MagicTemplate $template,
                                      ACL $acl): string {
        $role = $req->user->role;
        return json_encode([
            'contentPanels' => $dao->getFrontendPanels(),
            'adminPanels' => $role === ACL::ROLE_SUPER_ADMIN
                ? $this->cmsState->getApiConfigs()->getEnqueuedAdminPanels()
                : [],
            'baseUrl' => $template->url('/'),
            'assetBaseUrl' => $template->assetUrl('/'),
            'currentPagePath' => $req->path,
            'user' => ['role' => $role],
            'userPermissions' => [
                'canCreateContent' => $acl->can($role, 'create', 'content'),
                'canConfigureContent' => $acl->can($role, 'configure', 'content'),
                'canDeleteContent' => $acl->can($role, 'delete', 'content'),
                'canManageFieldsOfMultiFieldContent' => $acl->can($role,
                    'manageFieldsOf', 'multiFieldContent'),
            ],
        ]);
    }
}

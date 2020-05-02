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
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;
use RadCms\BaseAPI;
use RadCms\Auth\ACL;
use RadCms\Content\MagicTemplateDAO;
use RadCms\Theme\ThemeAPI;
use RadCms\Theme\ThemeInterface;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $cmsState;
    private $stockContentTypes;
    /**
     * @param \RadCms\CmsState $cmsState
     */
    public function __construct(CmsState $cmsState) {
        $storage = $cmsState->getApiConfigs();
        // @allow \Pike\PikeException
        $theSite = self::instantiateWebsite();
        $theSite->init(new WebsiteAPI($storage), false);
        // @allow \Pike\PikeException
        if (($theme = self::instantiateTheme())) {
            $themeApi = new ThemeAPI($storage);
            $theme->init($themeApi);
        }
        // @allow \Pike\PikeException
        $this->initStockContentTypes(new BaseAPI($storage));
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
        $storage = $this->cmsState->getApiConfigs();
        $layoutFileName = self::findLayout($storage->getRegisteredUrlLayouts(),
                                           $req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $dao->fetchRevisions = isset($req->user);
        $template = new MagicTemplate(RAD_PUBLIC_PATH . "site/{$layoutFileName}",
                                      ['_cssFiles' => $storage->getEnqueuedCssFiles(
                                          BaseAPI::TARGET_WEBSITE_LAYOUT),
                                       '_jsFiles' => $storage->getEnqueuedJsFiles(
                                           BaseAPI::TARGET_WEBSITE_LAYOUT)],
                                      $dao,
                                      $fs);
        $storage->applyRegisteredTemplateStuff($template, BaseAPI::TARGET_WEBSITE_LAYOUT);
        $url = $req->path ? explode('/', ltrim($req->path, '/')) : [''];
        $html = $template->render(['url' => $url,
                                   'urlStr' => $req->path,
                                   'site' => $this->cmsState->getSiteInfo()]);
        $res->html(!$req->user || ($bodyEnd = strpos($html, '</body>')) === false
            ? $html
            : $this->injectParentWindowCpanelSetupScript($html, $bodyEnd,
                $this->makeFrontendData($req, $dao, $template, $acl))
        );
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

    ////////////////////////////////////////////////////////////////////////////

    /**
     * Palauttaa uuden instanssin luokasta RAD_PUBLIC_PATH . 'site/Site.php'.
     *
     * @return \RadCms\Website\WebsiteInterface
     * @throws \Pike\PikeException
     */
    public static function instantiateWebsite(): WebsiteInterface {
        $clsPath = 'RadSite\\Site';
        if (!class_exists($clsPath))
            throw new PikeException("\"{$clsPath}\" missing",
                                    PikeException::BAD_INPUT);
        if (class_exists($clsPath)) {
            if (!array_key_exists(WebsiteInterface::class, class_implements($clsPath, false)))
                throw new PikeException("Site.php (\"{$clsPath}\") must implement RadCms\Website\WebsiteInterface",
                                        PikeException::BAD_INPUT);
            return new $clsPath();
        }
    }
    /**
     * Palauttaa uuden instanssin luokasta RAD_PUBLIC_PATH . 'site/Theme.php', tai
     * null mikäli sitä ei ole olemassa.
     *
     * @return \RadCms\Theme\ThemeInterface
     * @throws \Pike\PikeException
     */
    public static function instantiateTheme(): ?ThemeInterface {
        $clsPath = 'RadSite\\Theme';
        if (class_exists($clsPath)) {
            if (!array_key_exists(ThemeInterface::class, class_implements($clsPath, false)))
                throw new PikeException("Theme.php (\"{$clsPath}\") must implement RadCms\Theme\ThemeInterface",
                                        PikeException::BAD_INPUT);
            return new $clsPath();
        }
        return null;
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
}

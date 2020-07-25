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
use Pike\Translator;
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;
use RadCms\BaseAPI;
use RadCms\Theme\ThemeAPI;
use RadCms\Theme\ThemeInterface;

/**
 * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
 */
class WebsiteControllers {
    private $cmsState;
    private $dao;
    private $fs;
    private $translator;
    private $stockContentTypes;
    /**
     * @param \RadCms\CmsState $cmsState
     * @param \RadCms\Templating\MagicTemplateDAO $dao
     * @param \Pike\FileSystem $fs
     * @param \Pike\Translator $translator
     */
    public function __construct(CmsState $cmsState,
                                MagicTemplateContentDAO $dao,
                                FileSystem $fs,
                                Translator $translator) {
        $apiState = $cmsState->getApiConfigs();
        // @allow \Pike\PikeException
        if (($theme = self::instantiateTheme())) {
            $theme->init(new ThemeAPI($apiState, $cmsState->getPlugins()));
        }
        // @allow \Pike\PikeException
        $this->initStockContentTypes(new BaseAPI($apiState, $cmsState->getPlugins()));
        $this->cmsState = $cmsState;
        $this->dao = $dao;
        $this->fs = $fs;
        $this->translator = $translator;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     */
    public function handlePageRequest(Request $req, Response $res): void {
        $apiState = $this->cmsState->getApiConfigs();
        // @allow \Exception
        $apiState->triggerEvent(BaseAPI::ON_PAGE_LOADED, false, $req);
        $layoutFileName = self::findLayout($apiState->getRegisteredUrlLayouts(),
                                           $req->path);
        if (!$layoutFileName) {
            $res->html('404');
            return;
        }
        $isMaybeLoggedIn = $req->cookie('radUserIsMaybeLoggedIn') === 'yes';
        $this->dao->fetchRevisions = $isMaybeLoggedIn;
        $tmpl = new MagicTemplate(RAD_WORKSPACE_PATH . "site/{$layoutFileName}",
                                  ['_cssFiles' => $apiState->getEnqueuedCssFiles(
                                      BaseAPI::TARGET_WEBSITE_LAYOUT),
                                   '_jsFiles' => $apiState->getEnqueuedJsFiles(
                                       BaseAPI::TARGET_WEBSITE_LAYOUT)],
                                  $this->translator,
                                  $this->dao,
                                  $this->fs);
        $apiState->applyRegisteredTemplateStuff($tmpl, BaseAPI::TARGET_WEBSITE_LAYOUT);
        $url = $req->params->url;
        $html = $tmpl->render(['url' => explode('/', substr($url, 1)),
                               'urlStr' => $url,
                               'site' => $this->cmsState->getSiteInfo()]);
        $res->html(!$isMaybeLoggedIn || ($bodyEnd = strpos($html, '</body>')) === false
            ? $html
            : $this->injectParentWindowCpanelSetupScript($html, $bodyEnd, $req)
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
                                                         Request $req): string {
        $dataToFrontendApp = json_encode([
            'contentPanels' => $this->dao->getFrontendPanels(),
            'currentPagePath' => $req->path,
        ]);
        return substr($html, 0, $bodyEnd) .
            "<script>(function () {
                var s = document.createElement('style');
                s.innerHTML = '@keyframes radblink{from{background-color:rgba(0,90,255,0.18);}to{background-color:rgba(0,90,255,0.08);}}#rad-highlight-overlay{position:absolute;background-color:rgba(0,90,255,0.18);z-index:0;animation: .18s infinite alternate radblink;}';
                document.head.appendChild(s);
                //
                var bridge = (window.parent || {}).dataBridge;
                if (bridge) bridge.handleWebpageLoaded({$dataToFrontendApp});
            }())</script>" .
        substr($html, $bodyEnd);
    }

    ////////////////////////////////////////////////////////////////////////////

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
     * Palauttaa uuden instanssin luokasta RAD_WORKSPACE_PATH . 'site/Theme.php', tai
     * null mikäli sitä ei ole olemassa.
     *
     * @return \RadCms\Theme\ThemeInterface
     * @throws \Pike\PikeException
     */
    private static function instantiateTheme(): ?ThemeInterface {
        $clsPath = 'RadSite\\Theme';
        if (class_exists($clsPath)) {
            if (!array_key_exists(ThemeInterface::class, class_implements($clsPath, false)))
                throw new PikeException("Theme.php (\"{$clsPath}\") must implement RadCms\Theme\ThemeInterface",
                                        PikeException::BAD_INPUT);
            return new $clsPath();
        }
        return null;
    }
}

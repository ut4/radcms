<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\AppState;
use RadCms\Templating\MagicTemplate;

class AdminControllers {
    /**
     * GET /edit/<any>: renderöi sivuston hallintapaneeliversion.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\AppState $appState
     */
    public function handleEditViewRequest(Request $req,
                                          Response $res,
                                          SiteConfig $siteConfig,
                                          AppState $appState) {
        // @allow \Pike\PikeException
        if ($siteConfig->selfLoad(RAD_SITE_PATH . 'site.json') &&
            ((RAD_FLAGS & RAD_DEVMODE) &&
            $siteConfig->lastModTime > $appState->contentTypesLastUpdated)) {
            // @allow \Pike\PikeException
            $appState->diffAndSaveChangesToDb($siteConfig->contentTypes, 'site.json');
        }
        $res->html((new MagicTemplate(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php'))
            ->render(['q' => $req->params->q ?? '/',
                      'pluginJsFiles' => $appState->apiConfigs->getRegisteredPluginJsFiles()]));
    }
}

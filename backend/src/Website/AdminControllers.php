<?php

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\CmsState;
use RadCms\Templating\MagicTemplate;

class AdminControllers {
    /**
     * GET /edit/<any>: renderöi sivuston hallintapaneeliversion.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Website\SiteConfig $siteConfig
     * @param \RadCms\CmsState $cmsState
     */
    public function handleEditViewRequest(Request $req,
                                          Response $res,
                                          SiteConfig $siteConfig,
                                          CmsState $cmsState) {
        // @allow \Pike\PikeException
        $siteConfig->selfLoad(RAD_SITE_PATH . 'site.json');
        $res->html((new MagicTemplate(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php'))
            ->render(['q' => $req->params->q ?? '/',
                      'pluginJsFiles' => $cmsState->getApiConfigs()->getRegisteredPluginJsFiles()]));
    }
}

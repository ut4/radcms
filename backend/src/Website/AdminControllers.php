<?php

declare(strict_types=1);

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use RadCms\BaseAPI;
use RadCms\CmsState;
use RadCms\Templating\MagicTemplate;

class AdminControllers {
    /**
     * GET /edit/<any>: renderöi sivuston hallintapaneeliversion.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     */
    public function handleEditViewRequest(Request $req,
                                          Response $res,
                                          CmsState $cmsState): void {
        // @allow \Pike\PikeException
        $theSite = WebsiteControllers::instantiateWebsite();
        $storage = $cmsState->getApiConfigs();
        $theSite->init(new WebsiteAPI($storage), true);
        //
        $res->html((new MagicTemplate(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php'))
            ->render(['q' => $req->params->q ?? '/',
                      'adminJsFiles' => $storage->getEnqueuedJsFiles(
                            BaseAPI::TARGET_CONTROL_PANEL_LAYOUT)]));
    }
}

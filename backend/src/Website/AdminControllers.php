<?php

declare(strict_types=1);

namespace RadCms\Website;

use Pike\Request;
use Pike\Response;
use Pike\Translator;
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
     * @param \Pike\Translator $translator
     */
    public function handleEditViewRequest(Request $req,
                                          Response $res,
                                          CmsState $cmsState,
                                          Translator $translator): void {
        $apiState = $cmsState->getApiConfigs();
        // @allow \Exception
        $apiState->triggerEvent(BaseAPI::ON_PAGE_LOADED, true, $req);
        $res->html((new MagicTemplate(RAD_BASE_PATH . 'src/Website/cpanel.tmpl.php',
                                      null,
                                      $translator))
            ->render(['q' => $req->params->q ?? '/',
                      'adminJsFiles' => $apiState->getEnqueuedJsFiles(
                            BaseAPI::TARGET_CONTROL_PANEL_LAYOUT)]));
    }
}

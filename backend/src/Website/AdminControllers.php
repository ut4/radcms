<?php

declare(strict_types=1);

namespace RadCms\Website;

use Pike\{Request, Response, Translator};
use RadCms\{BaseAPI, CmsState};
use RadCms\Auth\ACL;
use RadCms\Templating\MagicTemplate;

class AdminControllers {
    /**
     * GET /_edit/<any>: renderöi hallintapaneelin.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     * @param \Pike\Translator $translator
     * @param \RadCms\Auth\ACL $acl
     */
    public function handleEditViewRequest(Request $req,
                                          Response $res,
                                          CmsState $cmsState,
                                          Translator $translator,
                                          ACL $acl): void {
        $apiState = $cmsState->getApiConfigs();
        // @allow \Exception
        $apiState->triggerEvent(BaseAPI::ON_PAGE_LOADED, true, $req);
        $tmpl = new MagicTemplate(RAD_BACKEND_PATH . 'src/Website/cpanel.tmpl.php',
                                  null,
                                  $translator);
        $role = $req->myData->user->role;
        $res->html($tmpl->render([
            'url' => $req->params->url ?? '',
            'adminJsFiles' => $apiState->getEnqueuedJsFiles(
                            BaseAPI::TARGET_CONTROL_PANEL_LAYOUT),
            'dataToFrontend' => json_encode([
                'adminPanels' => $role === ACL::ROLE_SUPER_ADMIN
                    ? $apiState->getEnqueuedAdminPanels()
                    : [],
                'baseUrl' => $tmpl->url('/'),
                'assetBaseUrl' => $tmpl->assetUrl('/'),
                'user' => ['role' => $role],
                'userPermissions' => [
                    'canCreateContent' => $acl->can($role, 'create', 'content'),
                    'canConfigureContent' => $acl->can($role, 'configure', 'content'),
                    'canDeleteContent' => $acl->can($role, 'delete', 'content'),
                    'canManageFieldsOfMultiFieldContent' => $acl->can($role,
                        'manageFieldsOf', 'multiFieldContent'),
                ],
                'csrfToken' => $req->myData->csrfToken ?? ''
            ])
        ]));
    }
}

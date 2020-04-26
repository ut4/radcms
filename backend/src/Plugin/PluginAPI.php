<?php

namespace RadCms\Plugin;

use Pike\Router;
use RadCms\BaseAPI;
use RadCms\APIConfigsStorage;
use RadCms\Auth\ACL;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class PluginAPI extends BaseAPI {
    private $router;
    /**
     * @param \Pike\Router $ctx
     * @param \Pike\Router $router = null
     */
    public function __construct(APIConfigsStorage $configs,
                                Router $router = null) {
        parent::__construct($configs);
        $this->router = $router;
    }
    /**
     * Rekisteröi reitti. Esimerkki: mapRoute(
     *     'GET',
     *     // ks. http://altorouter.com/usage/mapping-routes.html
     *     '/my-plugin/foo/[i:id]/[w:name]',
     *     MyController::class,
     *     'doSomething',
     *     'doSomething:myResource'
     * )
     *
     * @param string $method 'GET', 'POST'
     * @param string $url
     * @param string $ctrlCassPath
     * @param string $ctrlMethodNme
     * @param string $linkedAclActionAndResource = ACL::NO_NAME
     */
    public function registerRoute($method,
                                  $url,
                                  $ctrlCassPath,
                                  $ctrlMethodName,
                                  $linkedAclActionAndResource = ACL::NO_NAME) {
        $this->router->map($method, $url,
            [$ctrlCassPath, $ctrlMethodName, $linkedAclActionAndResource]
        );
    }
    /**
     * Rekisteröi osion hallintapaneelin "Devaajille"-välilehteen. $panelImplName
     * on sama kuin JS-API:n uiPanelRegister.registerUiPanelImpl(<tämä>, ...).
     * Esimerkki: enqueueFrontendAdminPanel('MoviesApp', 'ElokuvatApp').
     *
     * @param string $panelImplName
     * @param string $title
     */
    public function enqueueFrontendAdminPanel($panelImplName, $title) {
        $this->configsStorage->putAdminPanel((object)[
            'impl' => $panelImplName,
            'title' => $title,
        ]);
    }
}

<?php

declare(strict_types=1);

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
     * @param \RadCms\APIConfigsStorage $apiState
     * @param \ArrayObject $plugins
     * @param \Pike\Router $router = null
     */
    public function __construct(APIConfigsStorage $apiState,
                                \ArrayObject $plugins,
                                Router $router = null) {
        parent::__construct($apiState, $plugins);
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
     * @param string $linkedAclActionAndResource = ACL::NO_IDENTITY
     */
    public function registerRoute(string $method,
                                  string $url,
                                  string $ctrlCassPath,
                                  string $ctrlMethodName,
                                  string $linkedAclActionAndResource = ACL::NO_IDENTITY): void {
        $this->router->map($method, $url,
            [$ctrlCassPath, $ctrlMethodName, $linkedAclActionAndResource]
        );
    }
    /**
     * Rekisteröi osion hallintapaneelin "Devaajille"-välilehteen. $panelImplName
     * on sama kuin JS-API:n contentPanelRegister.registerImpl(<tämä>, ...).
     * Esimerkki: enqueueFrontendAdminPanel('MoviesApp', 'ElokuvatApp').
     *
     * @param string $panelImplName
     * @param string $title
     */
    public function enqueueFrontendAdminPanel(string $panelImplName,
                                              string $title): void {
        $this->configsStorage->putAdminPanel((object)[
            'impl' => $panelImplName,
            'title' => $title,
        ]);
    }
}

<?php

namespace RadCms\Plugin;

use Pike\Router;
use RadCms\BaseAPI;
use RadCms\APIConfigsStorage;
use RadCms\Auth\ACL;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class API {
    private $router;
    private $baseApi;
    private $apiConfigs;
    /**
     * @param \RadCms\BaseAPI $baseApi
     * @param \Pike\Router $ctx
     * @param \RadCms\APIConfigsStorage $configs
     */
    public function __construct(BaseAPI $baseApi,
                                Router $router,
                                APIConfigsStorage $configs) {
        $this->router = $router;
        $this->baseApi = $baseApi;
        $this->apiConfigs = $configs;
    }
    /**
     * @see \RadCms\BaseAPI->registerDirective().
     */
    public function registerDirective($directiveName, $fullFilePath, $for = '*') {
        // @allow \Pike\PikeException
        $this->baseApi->registerDirective($directiveName, $fullFilePath, $for);
    }
    /**
     * @see \RadCms\BaseAPI->registerDirectiveMethod().
     */
    public function registerDirectiveMethod($methodName,
                                            callable $fn,
                                            $for = '*',
                                            $bindToDirectiveScope = false) {
        // @allow \Pike\PikeException
        $this->baseApi->registerDirectiveMethod($methodName, $fn, $for, $bindToDirectiveScope);
    }
    /**
     * Rekisteröi <script src="<?= $scriptFileName ?>"> sisällytettäväksi
     * cpanel.php-tiedostoon. Esimerkki: registerJsFile('MyFile.js', ['type' => 'module']);
     *
     * @param string $scriptFileName
     * @param array $attrs = array
     */
    public function registerJsFile($scriptFileName, array $attrs = []) {
        $this->apiConfigs->putPluginJsFile((object)[
            'fileName' => $scriptFileName,
            'attrs' => $attrs,
        ]);
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
     * Rekisteröi osion hallintapaneelin Devaajille-välilehteen. $panelImplName sama
     * kuin JS-API:n uiPanelRegister.registerUiPanelImpl(<tämä>, ...). Esimerkki:
     * registerFrontendAdminPanel('MoviesApp', 'ElokuvatApp').
     *
     * @param string $panelImplName
     * @param string $title
     */
    public function registerFrontendAdminPanel($panelImplName, $title) {
        $this->apiConfigs->putAdminPanel((object)[
            'impl' => $panelImplName,
            'title' => $title,
        ]);
    }
}

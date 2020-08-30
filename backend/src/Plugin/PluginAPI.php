<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use Pike\{PikeException, Router};
use RadCms\{APIConfigsStorage, BaseAPI};
use RadCms\Auth\ACL;

/**
 * Lisäosien oma API. Passataan lisäosien (PluginInterface) init-metodiin.
 */
class PluginAPI extends BaseAPI {
    /** @var \Pike\Router */
    private $router;
    /** @var string */
    private $classNamespace;
    /** @var ?string */
    private $routeNamespace;
    /**
     * @param string $dir
     * @param \RadCms\APIConfigsStorage $apiState
     * @param \ArrayObject $plugins
     * @param \Pike\Router $router = null
     */
    public function __construct(string $dir,
                                APIConfigsStorage $apiState,
                                \ArrayObject $plugins,
                                Router $router = null) {
        parent::__construct($dir, $apiState, $plugins);
        $this->router = $router;
        $this->classNamespace = str_replace('plugins/', 'RadPlugins\\',
            substr($dir, 0, strlen($dir) - 1));
    }
    /**
     * Rekisteröi reitti. Esimerkki: mapRoute(
     *     'GET',
     *     // ks. http://altorouter.com/usage/mapping-routes.html
     *     '/plugins/my-plugin/foo/[i:id]/[w:name]',
     *     MyController::class,
     *     'doSomething',
     *     'doSomething:myResource'
     * )
     *
     * @param string $method 'GET', 'POST'
     * @param string $url
     * @param string $ctrlClassPath
     * @param string $ctrlMethodNme
     * @param string $linkedAclActionAndResource = ACL::NO_IDENTITY
     */
    public function registerRoute(string $method,
                                  string $url,
                                  string $ctrlClassPath,
                                  string $ctrlMethodName,
                                  string $linkedAclActionAndResource = ACL::NO_IDENTITY): void {
        if (!$this->routeNamespace) {
            $pluginName = str_replace('RadPlugins\\', '', $this->classNamespace);
            $this->routeNamespace = '/plugins/' . strtolower(
            substr(preg_replace('/[A-Z]/', '-\\0', $pluginName), 1));
        }
        if (strpos($url, $this->routeNamespace) !== 0)
            throw new PikeException("Expected route (`{$url}`) to start with `{$this->routeNamespace}`",
                                    PikeException::BAD_INPUT);
        if (strpos($ctrlClassPath, $this->classNamespace) !== 0)
            throw new PikeException("Expected ctrlClassPath (`{$ctrlClassPath}`) to start with `{$this->classNamespace}`",
                                    PikeException::BAD_INPUT);
        $this->router->map($method, $url,
            [$ctrlClassPath, $ctrlMethodName, $linkedAclActionAndResource]
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

<?php

namespace RadCms\Installer;

use RadCms\Router;
use RadCms\Request;

class InstallerApp {
    private $router;
    private $makeCtrl;
    /**
     * @param string $sitePath Absoluuttinen polku applikaation public-kansioon (sama kuin install.php:n sijainti)
     * @param \Closure $makeCtrl Function<($sitePath: string): \RadCms\Installer\InstallerControllers>
     */
    public function __construct($sitePath, \Closure $makeCtrl = null) {
        $this->router = new Router();
        $this->makeCtrl = $makeCtrl;
        $this->registerRoutes($sitePath);
    }

    /**
     * RadCMS:n installerin entry-point.
     *
     * @param string|\RadCms\Request $urlOrRequest
     * @param \RadCms\Response $response = null
     */
    public function handleRequest($urlOrRequest, $response = null) {
        $this->router->dispatch(
            !($urlOrRequest instanceof Request)
                ? Request::createFromGlobals('', $urlOrRequest)
                : $urlOrRequest,
            $response
        );
    }
    /**
     * Rekisteröi handlerit installerin sisältämille http-reiteille.
     */
    private function registerRoutes($sitePath) {
        $this->router->addMatcher(function ($url, $method) use ($sitePath) {
            if (strpos($url, '/') === 0) {
                $ctrl = $this->makeCtrl->__invoke($sitePath);
                return [$ctrl, $method == 'GET' ? 'renderHomeView' : 'handleInstallRequest'];
            }
        });
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param string $DIR
     * @param \Closure $makeCtrl = function ($sitePath) { return new InstallerControllers($sitePath); };
     * @return \RadCms\Installer\InstallerApp
     */
    public static function create($DIR = '', \Closure $makeCtrl = null) {
        return new InstallerApp(str_replace('\\', '/', $DIR) . '/',
                                $makeCtrl ?: function ($sitePath) {
                                    return new InstallerControllers($sitePath);
                                });
    }
}
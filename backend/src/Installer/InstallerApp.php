<?php

namespace RadCms\Installer;

use RadCms\Router;
use RadCms\Request;

class InstallerApp {
    private $router;
    /**
     * @param string $sitePath Absoluuttinen polku applikaation public-kansioon (sama kuin install.php:n sijainti)
     */
    public function __construct($sitePath) {
        $this->router = new Router();
        $this->registerRoutes((object) ['sitePath' => $sitePath]);
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
    private function registerRoutes($context) {
        $makeCtrl = function () use ($context) {
            return new InstallerControllers($context->sitePath);
        };
        $this->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if (strpos($url, '/') === 0)
                return [$makeCtrl(), $method == 'GET' ? 'renderHomeView' : 'handleInstallRequest'];
        });
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param string $DIR
     * @return \RadCms\Installer\InstallerApp
     */
    public static function create($DIR = '') {
        return new InstallerApp(str_replace('\\', '/', $DIR) . '/');
    }
}
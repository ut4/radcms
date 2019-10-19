<?php

namespace RadCms\Installer;

use AltoRouter;
use RadCms\Request;
use RadCms\Response;

class InstallerApp {
    private $router;
    private $makeCtrl;
    /**
     * @param string $sitePath Absoluuttinen polku applikaation public-kansioon (sama kuin install.php:n sijainti)
     * @param \Closure $makeCtrl Function<($sitePath: string): \RadCms\Installer\InstallerControllers>
     */
    public function __construct($sitePath, \Closure $makeCtrl = null) {
        $this->router = new AltoRouter();
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
        $request = !($urlOrRequest instanceof Request)
            ? Request::createFromGlobals('', $urlOrRequest)
            : $urlOrRequest;
        if (($match = $this->router->match($request->path, $request->method))) {
            $request->params = $match['params'];
            $match['target']()($request, $response ?? new Response());
        } else {
            header($_SERVER['SERVER_PROTOCOL'] . ' 404 Not Found');
        }
    }
    /**
     * Rekisteröi handlerit installerin sisältämille http-reiteille.
     */
    private function registerRoutes($sitePath) {
        $this->router->map('GET', '/', function () use ($sitePath) {
            $ctrl = $this->makeCtrl->__invoke($sitePath);
            return [$ctrl, 'renderHomeView'];
        });
        $this->router->map('POST', '/', function () use ($sitePath) {
            $ctrl = $this->makeCtrl->__invoke($sitePath);
            return [$ctrl, 'handleInstallRequest'];
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
                                $makeCtrl ?? function ($sitePath) {
                                    return new InstallerControllers($sitePath);
                                });
    }
}
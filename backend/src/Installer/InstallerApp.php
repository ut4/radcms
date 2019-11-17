<?php

namespace RadCms\Installer;

use AltoRouter;
use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Packager\ZipPackageStream;

class InstallerApp {
    private $router;
    private $makeCtrl;
    /**
     * @param string $indexFilePath Absoluuttinen polku applikaation public-kansioon (sama kuin index|install.php:n sijainti). Esim. '/var/www/html/dir/'
     * @param \Closure $makeCtrl Function<($indexFilePath: string): \RadCms\Installer\InstallerControllers>
     */
    public function __construct($indexFilePath, \Closure $makeCtrl = null) {
        $this->router = new AltoRouter();
        $this->makeCtrl = $makeCtrl;
        $this->registerRoutes($indexFilePath);
    }

    /**
     * RadCMS:n installerin entry-point.
     *
     * @param string|\RadCms\Framework\Request $urlOrRequest
     * @param \RadCms\Framework\Response $response = null
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
    private function registerRoutes($indexFilePath) {
        $this->router->map('GET', '/', function () use ($indexFilePath) {
            $ctrl = $this->makeCtrl->__invoke($indexFilePath);
            return [$ctrl, 'renderHomeView'];
        });
        $this->router->map('POST', '/', function () use ($indexFilePath) {
            $ctrl = $this->makeCtrl->__invoke($indexFilePath);
            return [$ctrl, 'handleInstallRequest'];
        });
        $this->router->map('POST', '/from-package', function () use ($indexFilePath) {
            $ctrl = $this->makeCtrl->__invoke($indexFilePath);
            return [$ctrl, 'handleInstallFromPackageRequest'];
        });
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param string $DIR
     * @param \Closure $makeCtrl = function ($indexFilePath) { return new InstallerControllers($indexFilePath); };
     * @return \RadCms\Installer\InstallerApp
     */
    public static function create($DIR, \Closure $makeCtrl = null) {
        return new InstallerApp(str_replace('\\', '/', $DIR) . '/',
                                $makeCtrl ?? function ($indexFilePath) {
                                    return new InstallerControllers($indexFilePath);
                                });
    }
}
<?php

namespace RadCms\Installer;

abstract class Module {
    /**
     * Rekisteröi install.php?q=* http-reitit.
     */
    public static function init(\stdClass $ctx) {
        $ctx->router->map('GET', '/', function () {
            return [InstallerControllers::class, 'renderHomeView', false];
        });
        $ctx->router->map('POST', '/', function () {
            return [InstallerControllers::class, 'handleInstallRequest', false];
        });
        $ctx->router->map('POST', '/from-package', function () {
            return [InstallerControllers::class, 'handleInstallFromPackageRequest', false];
        });
    }
}

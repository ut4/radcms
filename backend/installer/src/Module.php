<?php

namespace RadCms\Installer;

abstract class Module {
    /**
     * Rekisteröi install.php?q=* http-reitit.
     */
    public static function init(\stdClass $ctx) {
        $ctx->router->map('GET', '/',
            [InstallerControllers::class, 'renderHomeView', false]
        );
        $ctx->router->map('POST', '/',
            [InstallerControllers::class, 'handleInstallRequest', false]
        );
        $ctx->router->map('POST', '/from-package',
            [InstallerControllers::class, 'handleInstallFromPackageRequest', false]
        );
    }
}

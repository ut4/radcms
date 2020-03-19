<?php

namespace RadCms\Installer;

use RadCms\Packager\PackageStreamInterface;
use RadCms\Packager\ZipPackageStream;

abstract class Module {
    /**
     * Rekisteröi install.php?q=* http-reitit.
     *
     * @param \stdClass $ctx
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
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC($container) {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

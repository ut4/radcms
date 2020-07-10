<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Auryn\Injector;
use RadCms\AppContext;
use RadCms\Packager\{PackageStreamInterface, ZipPackageStream};

abstract class Module {
    /**
     * Rekisteröi install.php?q=* http-reitit.
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
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
    public static function alterIOC(Injector $container): void {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

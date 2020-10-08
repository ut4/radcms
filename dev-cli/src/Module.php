<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Auryn\Injector;
use RadCms\{AppContext, Auth\ACL};
use RadCms\Packager\{PackageStreamInterface, ZipPackageStream};

abstract class Module {
    /**
     * Rekisteröi dev-cli.php komentoriviohjelman "reitit".
     *
     * @param \RadCms\AppContext $ctx
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('PSEUDO', '/make-release/[**:dirPath]',
            [MainController::class, 'makeRelease', ACL::NO_IDENTITY]
        );
        $ctx->router->map('PSEUDO', '/print-acl-rules',
            [MainController::class, 'printAclRules', ACL::NO_IDENTITY]
        );
        $ctx->router->map('PSEUDO', '/make-update-package/[*:settingsFileName]/[*:signingKey]',
            [MainController::class, 'buildUpdatePackage', ACL::NO_IDENTITY]
        );
    }
    /**
     * @param \Auryn\Injector $container
     */
    public static function alterIOC(Injector $container): void {
        $container->alias(PackageStreamInterface::class, ZipPackageStream::class);
    }
}

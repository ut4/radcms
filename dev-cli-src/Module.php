<?php

declare(strict_types=1);

namespace RadCms\Cli;

use RadCms\Auth\ACL;

abstract class Module {
    /**
     * Rekisteröi dev-cli.php komentoriviohjelman "reitit".
     *
     * @param \stdClass $ctx
     */
    public static function init(\stdClass $ctx): void {
        $ctx->router->map('PSEUDO', '/make-release/[**:dirPath]',
            [MainController::class, 'makeRelease', ACL::NO_IDENTITY]
        );
        $ctx->router->map('PSEUDO', '/print-acl-rules',
            [MainController::class, 'printAclRules', ACL::NO_IDENTITY]
        );
    }
}

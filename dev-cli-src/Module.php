<?php

namespace RadCms\Cli;

use RadCms\Auth\ACL;

abstract class Module {
    /**
     * Rekisteröi dev-cli.php komentoriviohjelman "reitit".
     *
     * @param object $ctx
     */
    public static function init(\stdClass $ctx) {
        $ctx->router->map('PSEUDO', '/make-release/[**:dirPath]',
            [MainController::class, 'makeRelease', ACL::NO_NAME]
        );
        $ctx->router->map('PSEUDO', '/print-acl-rules',
            [MainController::class, 'printAclRules', ACL::NO_NAME]
        );
    }
}

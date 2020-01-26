<?php

namespace RadCms\Cli;

abstract class Module {
    /**
     * Rekisteröi dev-cli.php komentoriviohjelman "reitit".
     *
     * @param object $ctx
     */
    public static function init(\stdClass $ctx) {
        $ctx->router->map('PSEUDO', '/make-release/[**:dirPath]',
            [MainController::class, 'makeRelease', false]
        );
    }
}

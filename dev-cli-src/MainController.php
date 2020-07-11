<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Pike\Request;

final class MainController {
    /**
     * `php dev-cli.php make-release <kohdeKansio>`: bundlaa RadCMS:n kokonai-
     * suudessaan github.com/ut4/radcms/releases/<vers> varten kansioon <kohdeKansio>.
     * Olettaa, että tämä komento ajetaan komentokehotteesta, jonka pathista
     * löytyy `composer`, ja `git`.
     */
    public function makeRelease(Request $req, Bundler $bundler): void {
        // @allow \Pike\PikeException
        $bundler->makeRelease($req->params->dirPath,
                              function ($msg) { echo $msg . PHP_EOL; },
                              '\shell_exec');
    }
    /**
     * `php dev-cli.php print-acl-rules`
     */
    public function printAclRules(): void {
        $fn = require dirname(__DIR__) . '/backend/installer/default-acl-rules.php';
        echo json_encode($fn());
    }
}

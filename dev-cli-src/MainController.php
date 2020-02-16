<?php

namespace RadCms\Cli;

use Pike\Request;

class MainController {
    /**
     * "dev-cli.php make-release <kohdeKansio>": bundlaa RadCMS:n kokonaisuudes-
     * saan <githubsivu>/releases/<vers> varten kansioon <kohdeKansio>. Olettaa,
     * että tämä komento ajetaan komentokehotteesta, jonka pathista löytyy
     * `composer`, ja `git`.
     */
    public function makeRelease(Request $req, Bundler $bundler) {
        // @allow \Pike\PikeException
        $bundler->makeRelease($req->params->dirPath,
                              function ($msg) { echo $msg . PHP_EOL; },
                              '\shell_exec');
    }
    /**
     * ...
     */
    public function printAclRules() {
        $fn = require dirname(__DIR__) . '/backend/installer/default-acl-rules.php';
        echo json_encode($fn());
    }
}

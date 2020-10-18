<?php

declare(strict_types=1);

namespace RadCms\Cli;

use Pike\{PikeException, Request, Validation};

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
        $fn = require RAD_WORKSPACE_PATH . 'backend/installer/default-acl-rules.php';
        echo json_encode($fn());
    }
    /**
     * `php dev-cli.php make-update-package input.json <väh32MerkkinenSalausavain> <kohdeSivustonSecret>`:
     * luo allekirjoitetun päivityspaketin, jonka cms:n käyttäjä voi asentaa hallin-
     * tapaneelista ladattuaan sen ensin päivitettävän sivuston serverin lähdekoodi-
     * kansioon.
     */
    public function buildUpdatePackage(Request $req,
                                       UpdatePackageGenerator $generator): void {
        if (($errors = self::validateBuildUpdatePackageParams($req->params)))
            throw new PikeException(implode(' | ', $errors), PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $package = $generator->generate($req->params->settingsFileName,
                                        $req->params->signingKey,
                                        $req->params->targetSiteSecret);
        // @allow \Pike\PikeException
        $package->writeToDisk();
    }
    /**
     * @param object $params
     * @return string[]
     */
    private static function validateBuildUpdatePackageParams(object $params): array {
        return Validation::makeObjectValidator()
            ->rule('settingsFileName', 'type', 'string')
            ->rule('signingKey', 'minLength', '32')
            ->validate($params);
    }
}

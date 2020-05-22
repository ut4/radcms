<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\Request;
use Pike\Response;
use Pike\Validation;
use Pike\Auth\Authenticator;

/**
 * Handlaa /api/packager -alkuiset pyynnöt.
 */
class PackagerControllers {
    /** @var \RadCms\Packager\Packager */
    private $packager;
    /**
     * @param \RadCms\Packager\Packager $packager
     */
    public function __construct(Packager $packager) {
        $this->packager = $packager;
    }
    /**
     * GET /api/packager/pre-run.
     *
     * @param \Pike\Response $res
     */
    public function handlePreRunCreatePackage(Response $res): void {
        $res->json($this->packager->preRun());
    }
    /**
     * POST /api/packager.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param \Pike\Auth\Authenticator $auth
     */
    public function handleCreatePackage(Request $req,
                                        Response $res,
                                        PackageStreamInterface $package,
                                        Authenticator $auth): void {
        if (($errors = $this->validatePackSiteInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $data = $this->packager->packSite($package, $req->body, $auth->getIdentity());
        $res->attachment($data, 'packed.radsite', 'application/octet-stream');
    }
    /**
     * @return string[]
     */
    private function validatePackSiteInput(\stdClass $input): array {
        $customErrors = [];
        $v = Validation::makeObjectValidator()
            ->addRuleImpl('nonRelativePath', function ($value) {
                return is_string($value) && strpos($value, './') === false;
            }, '%s is not valid path')
            ->rule('signingKey', 'type', 'string')
            ->rule('signingKey', 'minLength', 12);
        if (is_array($input->templates = self::jsonDecodeSafe($input, 'templates')))
            $v->rule('templates.*', 'nonRelativePath');
        else
            $customErrors[] = 'templates must be json';
        if (is_array($input->assets = self::jsonDecodeSafe($input, 'assets')))
            $v->rule('assets.*', 'nonRelativePath');
        else
            $customErrors[] = 'assets must be json';
        return array_merge($customErrors, $v->validate($input));
    }
    /**
     * @return array|null
     */
    private static function jsonDecodeSafe(\stdClass $input, string $key): ?array {
        $candidate = $input->$key ?? null;
        if (!is_string($candidate)) return null;
        return json_decode($candidate);
    }
}

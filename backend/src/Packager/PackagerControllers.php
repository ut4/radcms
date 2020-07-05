<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\{Request, Response, Validation};
use Pike\Auth\Authenticator;
use RadCms\Content\DAO;

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
     * @param \RadCms\Content\DAO $dao
     */
    public function handleCreatePackage(Request $req,
                                        Response $res,
                                        PackageStreamInterface $package,
                                        Authenticator $auth,
                                        DAO $dao): void {
        if (($errors = $this->validateAndPrepareSiteInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $data = $this->packager->packSite($package, $req->body, $auth->getIdentity(),
                                          $dao);
        $res->attachment($data, 'packed.radsite', 'application/octet-stream');
    }
    /**
     * @return string[]
     */
    private function validateAndPrepareSiteInput(\stdClass $input): array {
        $customErrors = [];
        $v = Validation::makeObjectValidator()
            ->addRuleImpl('nonRelativePath', function ($value) {
                return is_string($value) && strpos($value, './') === false;
            }, '%s is not valid path')
            ->rule('signingKey', 'type', 'string')
            ->rule('signingKey', 'minLength', Packager::MIN_SIGNING_KEY_LEN);
        //
        foreach (['templates', 'assets', 'uploads'] as $fileGroup)
            $v->rule("{$fileGroup}.*", 'nonRelativePath');
        //
        $v->rule("plugins.*", 'identifier');
        //
        return array_merge($customErrors, $v->validate($input));
    }
}

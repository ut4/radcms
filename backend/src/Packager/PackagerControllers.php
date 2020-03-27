<?php

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
    public function handlePreRunCreatePackage(Response $res) {
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
                                        Authenticator $auth) {
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
    private function validatePackSiteInput($input) {
        $customErrors = [];
        $v = Validation::makeObjectValidator()
            ->rule('signingKey', 'type', 'string')
            ->rule('signingKey', 'minLength', 12);
        if (is_array($input->templates = json_decode($input->templates ?? null)))
            $v->rule('templates.*', 'type', 'string');
        else
            $customErrors[] = 'templates must be json';
        if (is_array($input->themeAssets = json_decode($input->themeAssets ?? null)))
            $v->rule('themeAssets.*', 'type', 'string');
        else
            $customErrors[] = 'themeAssets must be json';
        return array_merge($customErrors, $v->validate($input));
    }
}

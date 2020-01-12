<?php

namespace RadCms\Packager;

use Pike\Request;
use Pike\Response;

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
     * POST /api/packager.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     */
    public function handleCreatePackage(Request $req, Response $res) {
        if (strlen($req->body->signingKey) < 12) {
            $res->status(400)->json(['signingKey must be >= 12 characters long']);
            return;
        }
        // @allow \RadCMS\Common\PikeException
        $data = $this->packager->packSite(RAD_SITE_PATH, $req->body->signingKey);
        $res->attachment($data, 'site.rpkg', 'application/octet-stream');
    }
}

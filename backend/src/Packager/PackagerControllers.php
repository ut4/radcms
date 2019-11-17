<?php

namespace RadCms\Packager;

use RadCms\Framework\Request;
use RadCms\Framework\Response;

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
     * POST /api/packager/:signingKey.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     */
    public function handleCreatePackage(Request $req, Response $res) {
        if (mb_strlen($req->params->signingKey) < 12) {
            $res->status(400)->json(['signingKey must be >= 12 characters long']);
            return;
        }
        // @allow \RadCMS\Common\RadException
        $data = $this->packager->packSite(RAD_SITE_PATH, $req->params->signingKey);
        $res->attachment($data);
    }
}

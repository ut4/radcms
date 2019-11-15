<?php

namespace RadCms\ContentType;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\Db;

/**
 * Handlaa /api/content-types -alkuiset pyynnöt.
 */
class ContentTypeControllers {
    /**
     * ...
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * GET /api/content-type/:name.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\ContentType\ContentTypeCollection $ctypes
     */
    public function handleGetContentType(Request $req,
                                         Response $res,
                                         ContentTypeCollection $ctypes) {
        $ctype = $ctypes->find($req->params->name);
        if ($ctype) $res->json($ctype);
        else $res->status(404)->json(['got' => 'nothing']);
    }
    /**
     * GET /api/content-type.
     *
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\ContentType\ContentTypeCollection $ctypes
     */
    public function handleGetAllContentTypes(Response $res,
                                             ContentTypeCollection $ctypes) {
        $res->json($ctypes->toArray());
    }
}

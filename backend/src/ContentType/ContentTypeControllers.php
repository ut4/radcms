<?php

namespace RadCms\ContentType;

use Pike\Request;
use Pike\Response;
use Pike\Db;

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
     * @param \Pike\Request $req
     * @param \Pike\Response $res
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
     * GET /api/content-type/:filter.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeCollection $ctypes
     */
    public function handleGetContentTypes(Request $req,
                                          Response $res,
                                          ContentTypeCollection $ctypes) {
        $filter = $req->params->filter ?? '';
        $res->json($filter !== 'no-internals'
            ? $ctypes->toArray()
            : $ctypes->filter(false, 'isInternal')->toArray());
    }
}

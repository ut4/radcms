<?php

namespace RadCms\Content;

use RadCms\Request;
use RadCms\Response;

class ContentControllers {
    /**
     * Handlaa /api/content, ja /api/content-type -alkuiset pyynnöt.
     */
    public function __construct() {
        //
    }
    /**
     * GET /api/content/:id.
     *
     * @param Request $req
     * @param Response $res
     */
    public function handleGetContentNode(Request $req, Response $res) {
        return $res->type('json')->send([
            'id' => 1, 
            'name' => 'footer',
            'json' => json_encode(['content' => '(c) 2034 MySitea']),
            'contentTypeId' => 1
        ]);
    }
    /**
     * GET /api/content-type/:id.
     *
     * @param Request $req
     * @param Response $res
     */
    public function handleGetContentType(Request $req, Response $res) {
        return $res->type('json')->send([
            'id' => 1, 
            'name' => 'Generic blobs',
            'fields' => ['content' => 'richtext']
        ]);
    }
}

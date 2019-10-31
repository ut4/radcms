<?php

namespace RadCms\Content;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\Db;

/**
 * Handlaa /api/content, ja /api/content-type -alkuiset pyynnöt.
 */
class ContentControllers {
    /**
     * ...
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * GET /api/content/:id.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     */
    public function handleGetContentNode(Request $req, Response $res) {
        return $res->json([
            'id' => 1,
            'name' => 'footer',
            'json' => json_encode(['content' => '(c) 2034 MySitea']),
            'contentTypeId' => 1
        ]);
    }
    /**
     * GET /api/content-type/:id.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     */
    public function handleGetContentType(Request $req, Response $res) {
        return $res->json([
            'id' => 1, 
            'name' => 'Generic blobs',
            'fields' => ['content' => 'richtext']
        ]);
    }
}

<?php

namespace RadCms\Content;

use RadCms\Request;
use RadCms\Response;
use RadCms\Common\Db;
use RadCms\ContentType\ContentTypeValidator;

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
     * @param Request $req
     * @param Response $res
     */
    public function handleGetContentNode(Request $req, Response $res) {
        // todo validate input
        $errors = [];
        $this->contentTypes->populateFromDb($this->db);
        $ctype = $this->contentTypes->find(array_pop(explode('/', $req->path)));
        if (!$ctype) array_push($errors, 'not valid ctype');
        //
        if ($errors) {
            $res->type('json')->status(400)->send($errors);
            return;
        }
        $row = $this->db->fetchOne('select `id`, ' . $ctype->fieldsToSql() .
                                   ' from ${p}' . $ctype->name);
        return $res->type('json')->send($row ? (object) $row : null);
    }
    /**
     * PUT /api/content/:id.
     *
     * @param Request $req
     * @param Response $res
     */
    public function handleUpdateContentNode(Request $req, Response $res) {
        if (ContentTypeValidator::validateName($req->contentTypeName)) return;
        $this->db->exec('');
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

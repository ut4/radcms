<?php

namespace RadCms\Content;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\Db;
use RadCms\Content\DAO;
use RadCms\Content\DMO;

/**
 * Handlaa /api/content -alkuiset pyynnöt.
 */
class ContentControllers {
    /**
     * ...
     */
    public function __construct(Db $db) {
        $this->db = $db;
    }
    /**
     * POST /api/content/:contentTypeName.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleCreateContentNode(Request $req, Response $res, DMO $dmo) {
        // @allow \RadCMS\Common\RadException
        $numRows = $dmo->insert($req->params->contentTypeName, $req->body);
        $res->json(['numAffectedRows' => $numRows,
                    'lastInsertId' => $dmo->lastInsertId]);
    }
    /**
     * GET /api/content/:contentTypeName/:id.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\Content\DAO $dao
     */
    public function handleGetContentNode(Request $req, Response $res, DAO $dao) {
        // @allow \RadCMS\Common\RadException
        $node = $dao->fetchOne($req->params->contentTypeName)
                    ->where('`id` = ?', [$req->params->id]) // aina [0-9]
                    ->exec();
        if ($node) $res->json($node);
        else $res->status(404)->json(['got' => 'nothing']);
    }
    /**
     * PUT /api/content/:contentTypeName/:id.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleUpdateContentNode(Request $req, Response $res, DMO $dmo) {
        // @allow \RadCMS\Common\RadException
        $numRows = $dmo->update($req->params->id, $req->params->contentTypeName, $req->body);
        $res->json(['numAffectedRows' => $numRows]);
    }
}

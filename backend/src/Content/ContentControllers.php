<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\Request;
use Pike\Response;

/**
 * Handlaa /api/content -alkuiset pyynnöt.
 */
class ContentControllers {
    const REV_SETTING_PUBLISH = 'publish';
    /**
     * POST /api/content/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleCreateContentNode(Request $req,
                                            Response $res,
                                            DMO $dmo): void {
        // @allow \Pike\PikeException
        $numRows = $dmo->insert($req->params->contentTypeName,
                                $req->body,
                                property_exists($req->params, 'revisionSettings'));
        $res->json(['numAffectedRows' => $numRows,
                    'lastInsertId' => $dmo->lastInsertId]);
    }
    /**
     * GET /api/content/:id/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\MagicTemplateDAO $dao
     */
    public function handleGetContentNode(Request $req,
                                         Response $res,
                                         MagicTemplateDAO $dao): void {
        // @allow \Pike\PikeException
        $node = $dao->fetchOne($req->params->contentTypeName)
                    ->where('`id` = ?', $req->params->id) // aina validi (läpäissyt routerin regexpin)
                    ->exec();
        if ($node) $res->json($node);
        else $res->status(404)->json(['got' => 'nothing']);
    }
    /**
     * GET /api/content/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\MagicTemplateDAO $dao
     */
    public function handleGetContentNodesByType(Request $req,
                                                Response $res,
                                                MagicTemplateDAO $dao): void {
        // @allow \Pike\PikeException
        $nodes = $dao->fetchAll($req->params->contentTypeName)->limit(50)->exec();
        $res->json($nodes);
    }
    /**
     * PUT /api/content/:id/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleUpdateContentNode(Request $req,
                                            Response $res,
                                            DMO $dmo): void {
        // @allow \Pike\PikeException
        $numRows = $dmo->update($req->params->id,
                                $req->params->contentTypeName,
                                $req->body,
                                $req->params->revisionSettings ?? '');
        $res->json(['numAffectedRows' => $numRows]);
    }
    /**
     * DELETE /api/content/:id/:contentTypeName.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleDeleteContentNode(Request $req,
                                            Response $res,
                                            DMO $dmo): void {
        // @allow \Pike\PikeException
        $numRows = $dmo->delete($req->params->id,
                                $req->params->contentTypeName);
        $res->json(['numAffectedRows' => $numRows]);
    }
}

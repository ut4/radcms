<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\{Request, Response};
use RadCms\Api\QueryFilters;

/**
 * Handlaa /api/content -alkuiset pyynnöt.
 */
class ContentControllers {
    const REV_SETTING_PUBLISH = 'publish';
    const REV_SETTING_UNPUBLISH = 'unpublish';
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
                    'lastInsertId' => (int) $dmo->lastInsertId]);
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
        $res->json($node);
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
        $q = $dao->fetchAll($req->params->contentTypeName);
        $limitExpr = '50';
        if (is_string($req->params->filters ?? null)) {
            // @allow \Pike\PikeException
            [$whereSql, $whereVals, $filterLimitExpr] =
                QueryFilters::fromString($req->params->filters)->toQParts();
            if ($whereSql) $q->where(implode(' ', $whereSql), ...$whereVals);
            if ($filterLimitExpr) $limitExpr = $filterLimitExpr;
        }
        // @allow \Pike\PikeException
        $nodes = $q->limitExpr($limitExpr)->exec();
        $res->json($nodes);
    }
    /**
     * PUT /api/content/:id/:contentTypeName/:revisionSettings?.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\DMO $dmo
     */
    public function handleUpdateContentNode(Request $req,
                                            Response $res,
                                            DMO $dmo): void {
        // @allow \Pike\PikeException
        $numRows = $dmo->update((int) $req->params->id,
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
        $numRows = $dmo->delete((int) $req->params->id,
                                $req->params->contentTypeName);
        $res->json(['numAffectedRows' => $numRows]);
    }
}

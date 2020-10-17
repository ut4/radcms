<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\{PikeException, Request, Response};
use RadCms\Api\QueryFilters;
use RadCms\Content\Internal\RevisionRepository;
use RadCms\ContentType\ContentTypeValidator;

/**
 * Handlaa /api/content -alkuiset pyynnöt.
 */
class ContentControllers {
    public const REV_SETTING_PUBLISH = 'publish';
    public const REV_SETTING_UNPUBLISH = 'unpublish';
    /**
     * POST /api/content/:contentTypeName: insertoi uuden sisältönoden tietokantaan.
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
                                property_exists($req->params, 'publishSettings'),
                                true);
        $res->json(['numAffectedRows' => $numRows,
                    'lastInsertId' => $dmo->lastInsertId]);
    }
    /**
     * GET /api/content/:id/:contentTypeName: palauttaa yksittäisen sisältönoden
     * tietokannasta tai `null`.
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
     * GET /api/content/:contentTypeName: palauttaa filttereitä vastaavat (oletuksena
     * 50), $req->params->contentTypeName-tyyppiset sisältönodet tietokannasta,
     * tai `[]`.
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
     * GET /api/content/:id/:contentTypeName/revisions: palauttaa yksittäisen
     * sisältönoden versiohistorian tai `[]`.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\Internal\RevisionRepository $revisionsRepo
     */
    public function handleGetContentNodeRevisions(Request $req,
                                                  Response $res,
                                                  RevisionRepository $revisionsRepo): void {
        if (ContentTypeValidator::validateName($req->params->contentTypeName))
            throw new PikeException("`{$req->params->contentTypeName}` is not valid content type name",
                                    PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        $revs = $revisionsRepo->getMany($req->params->id, $req->params->contentTypeName);
        $res->json($revs);
    }
    /**
     * PUT /api/content/:id/:contentTypeName/:publishSettings?: päivittää yksit-
     * täisen sisältönoden tietokantaan.
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
                                $req->params->publishSettings ?? '',
                                true);
        $res->json(['numAffectedRows' => $numRows]);
    }
    /**
     * DELETE /api/content/:id/:contentTypeName: poistaa yksittäisen sisältönoden
     * tietokannasta.
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

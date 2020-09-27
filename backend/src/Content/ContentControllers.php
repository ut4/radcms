<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\{PikeException, Request, Response, Validation};

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
        if (is_string($req->params->filters ?? null) && ($filters = self::parseValidateAndMakeFilters($req))) {
            $whereSql = [];
            $whereVals = [];
            foreach ($filters as [$colNameOrKeyword, $filterType, $value]) {
                if (!$colNameOrKeyword && $filterType === '$limit') {
                    $limitExpr = $value;
                } elseif ($filterType === '$in' && $value) {
                    $whereSql[] = "`{$colNameOrKeyword}` IN (".implode(',',array_fill(0,count($value),'?')).")";
                    $whereVals = array_merge($whereVals, $value);
                } elseif ($filterType === '$startsWith') {
                    $whereSql[] = "`{$colNameOrKeyword}` LIKE ?";
                    $whereVals[] = "{$value}%";
                } elseif ($filterType === '$contains') {
                    $whereSql[] = "`{$colNameOrKeyword}` LIKE ?";
                    $whereVals[] = "%{$value}%";
                } elseif ($filterType === '$gt') {
                    $whereSql[] = "`{$colNameOrKeyword}` > ?";
                    $whereVals[] = $value;
                }
            }
            if ($whereSql) $q->where(implode(' ', $whereSql), ...$whereVals);
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
    /**
     * @param \Pike\Request $req
     * @return array<int, array<int, string|mixed[]>> [[<colNameOrKeyword>, <filterType>, <value>] ...]
     */
    private static function parseValidateAndMakeFilters(Request $req): ?array {
        $input = json_decode($req->params->filters);
        if (!is_object($input)) throw new PikeException('Filters must by an object',
                                                       PikeException::BAD_INPUT);
        $filters = [];
        foreach ($input as $colNameOrKeyword => $filter) {
            if ($colNameOrKeyword === '$limit') {
                // Note: arvo validoituu \RadCms\Content\Query->selfValidate() metodeissa
                $filters[] = [null, '$limit', strval($filter)];
                continue;
            }
            if (!is_object($filter))
                throw new PikeException('Filter must by an object',
                                        PikeException::BAD_INPUT);
            if (!Validation::isIdentifier($colNameOrKeyword))
                throw new PikeException("Filter column name `{$colNameOrKeyword}` is not" .
                                        " valid identifier",
                                        PikeException::BAD_INPUT);
            $filterType = key($filter);
            if (in_array($filterType, ['$in', '$startsWith', '$contains', '$gt'])) {
                if ($filterType === '$in' && !is_array($filter->{$filterType}))
                    throw new PikeException('$in value must be an array',
                                            PikeException::BAD_INPUT);
                $filters[] = [$colNameOrKeyword, $filterType, $filter->{$filterType}];
            } else
                throw new PikeException("Unsupported filter type `{$filterType}`",
                                        PikeException::BAD_INPUT);
        }
        return $filters;
    }
}

<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;

class MagicTemplateDAO extends DAO {
    private $queries;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchRevisions = true
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $fetchRevisions = true) {
        parent::__construct($db, $contentTypes, $fetchRevisions);
        $this->queries = [];
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\MagicTemplateQuery
     */
    public function fetchOne(string $contentTypeName): MagicTemplateQuery {
        [$contentTypeName, $alias] = parent::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        $this->queries[] = new MagicTemplateQuery($type, $alias, true, $this);
        return $this->queries[count($this->queries) - 1];
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\MagicTemplateQuery
     */
    public function fetchAll(string $contentTypeName): MagicTemplateQuery {
        [$contentTypeName, $alias] = parent::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        $this->queries[] = new MagicTemplateQuery($type, $alias, false, $this);
        return $this->queries[count($this->queries) - 1];
    }
    /**
     * @return array array<{impl: string, title: string ...}>
     */
    public function getFrontendPanels(): array {
        $out = [];
        foreach ($this->queries as $q) {
            if (($panels = $q->getFrontendPanels()))
                $out = array_merge($out, $panels);
        }
        return $out;
    }
    /**
     * @param string $sql
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param \stdClass[] $joins = [] {contentTypeName: string, alias: string, expr: string, bindVals: array, isLeft: bool, collectFn: \Closure, targetFieldName: string|null}[]
     * @param string $orderDir = null
     * @param \stdClass[] $frontendPanels = []
     * @return array|\stdClass|null
     */
    public function doExec(string $sql,
                           bool $isFetchOne,
                           array $bindVals = null,
                           array $joins = [],
                           string $orderDir = null,
                           array $frontendPanels = []) {
        $res = parent::doExec($sql, $isFetchOne, $bindVals, $joins, $orderDir);
        foreach ($frontendPanels as $def) $def->contentNodes = $res;
        if (!$res) return $res;
        //
        $res = $isFetchOne ? [$res] : $res;
        $out = [];
        if (!$this->fetchRevisions) {
            foreach ($res as $node) {
                if ($node->status === self::STATUS_PUBLISHED) $out[] = $node;
            }
        } else {
            foreach ($res as $node) {
                if (!$node->revisions) { $out[] = $node; continue; }
                $latestDraft = $node->revisions[0]->snapshot;
                $latestDraft->id = $node->id;
                $latestDraft->contentType = $node->contentType;
                $latestDraft->status = self::STATUS_PUBLISHED;
                $latestDraft->isRevision = true;
                $out[] = $latestDraft;
            }
        }
        return $isFetchOne ? $out[0] ?? null : $out;
    }
}

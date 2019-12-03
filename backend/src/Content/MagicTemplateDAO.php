<?php

namespace RadCms\Content;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;

class MagicTemplateDAO extends DAO {
    /**
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $includeRevisions = true
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $includeRevisions = true) {
        parent::__construct($db, $contentTypes, $includeRevisions);
    }
    /**
     * @param string $sql
     * @param string $queryId
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param object $join = null { $contentType: string; $collector: [\Closure, string]; }
     * @return array|object|null
     */
    public function doExec($sql,
                           $queryId,
                           $isFetchOne,
                           $bindVals = null,
                           $join = null) {
        $nodes = parent::doExec($sql, $queryId, $isFetchOne, $bindVals, $join);
        if (!$this->includeRevisions) return $nodes;
        $nodes = $isFetchOne ? [$nodes] : $nodes;
        $out = [];
        foreach ($nodes as $node) {
            if (!$node->isPublished) continue;
            if (!$node->revisions) { $out[] = $node; continue; }
            $latestDraft = $node->revisions[0]->snapshot;
            $latestDraft->id = $node->id;
            $latestDraft->isPublished = true;
            $latestDraft->isRevision = true;
            $out[] = $latestDraft;
        }
        return $isFetchOne ? $out[0] ?? null : $out;
    }
}

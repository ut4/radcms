<?php

namespace RadCms\Content;

use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;

class MagicTemplateDAO extends DAO {
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchRevisions = true
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $fetchRevisions = true) {
        parent::__construct($db, $contentTypes, $fetchRevisions);
    }
    /**
     * @param string $sql
     * @param string $queryId
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param object $join = null {contentType: string, collector: [\Closure, string]}
     * @return array|object|null
     */
    public function doExec($sql,
                           $queryId,
                           $isFetchOne,
                           $bindVals = null,
                           $join = null) {
        $res = parent::doExec($sql, $queryId, $isFetchOne, $bindVals, $join);
        if (!$res) return $res;
        //
        $res = $isFetchOne ? [$res] : $res;
        $out = [];
        if (!$this->fetchRevisions) {
            foreach ($res as $node) {
                if ($node->isPublished) $out[] = $node;
            }
        } else {
            foreach ($res as $node) {
                if (!$node->revisions) { $out[] = $node; continue; }
                $latestDraft = $node->revisions[0]->snapshot;
                $latestDraft->id = $node->id;
                $latestDraft->isPublished = true;
                $latestDraft->isRevision = true;
                $out[] = $latestDraft;
            }
        }
        return $isFetchOne ? $out[0] ?? null : $out;
    }
}

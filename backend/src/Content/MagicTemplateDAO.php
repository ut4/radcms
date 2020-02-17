<?php

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
    public function fetchOne($contentTypeName) {
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
    public function fetchAll($contentTypeName) {
        [$contentTypeName, $alias] = parent::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        $this->queries[] = new MagicTemplateQuery($type, $alias, false, $this);
        return $this->queries[count($this->queries) - 1];
    }
    /**
     * @return array array<{impl: string, title: string ...}>
     */
    public function getFrontendPanelInfos() {
        $out = [];
        foreach ($this->queries as $q) {
            if (($info = $q->getFrontendPanelInfo()))
                $out[] = $info;
        }
        return $out;
    }
    /**
     * @param string $sql
     * @param bool $isFetchOne
     * @param array $bindVals = null
     * @param \stdClass $join = null {contentType: string, alias: string, collector: [\Closure, string]}
     * @param \stdClass $frontendPanelInfo = null
     * @return array|\stdClass|null
     */
    public function doExec($sql,
                           $isFetchOne,
                           $bindVals = null,
                           $join = null,
                           $frontendPanelInfo = null) {
        $res = parent::doExec($sql, $isFetchOne, $bindVals, $join);
        if ($frontendPanelInfo) $frontendPanelInfo->contentNodes = $res;
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
                $latestDraft->contentType = $node->contentType;
                $latestDraft->isPublished = true;
                $latestDraft->isRevision = true;
                $out[] = $latestDraft;
            }
        }
        return $isFetchOne ? $out[0] ?? null : $out;
    }
}

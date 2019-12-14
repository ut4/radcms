<?php

namespace RadCms\Content;

use Pike\Db;
use RadCms\ContentType\ContentTypeCollection;
use Pike\PikeException;

class DAO {
    public $fetchRevisions;
    protected $db;
    protected $counter;
    protected $frontendPanelInfos;
    protected $contentTypes;
    /**
     * @param \Pike\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $fetchRevisions = false
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $fetchRevisions = false) {
        $this->db = $db;
        $this->contentTypes = $contentTypes;
        $this->counter = 0;
        $this->frontendPanelInfos = [];
        $this->fetchRevisions = $fetchRevisions;
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne($contentTypeName) {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query(++$this->counter, $type, $alias, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        [$contentTypeName, $alias] = self::parseContentTypeNameAndAlias($contentTypeName);
        // @allow \Pike\PikeException
        $type = $this->getContentType($contentTypeName);
        return new Query(++$this->counter, $type, $alias, false, $this);
    }
    /**
     * @param string $queryId
     * @param string $contentTypeName
     * @param string $implName
     * @param string $title
     * @param string $highlightSelector
     */
    public function addFrontendPanelInfo($queryId,
                                         $contentTypeName,
                                         $implName,
                                         $title,
                                         $highlightSelector) {
        $this->frontendPanelInfos[$queryId] = (object)[
            'id' => $queryId,
            'impl' => $implName,
            'title' => $title,
            'contentTypeName' => $contentTypeName,
            'contentNodes' => null,
            'highlightSelector' => $highlightSelector,
        ];
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
        $out = null;
        // @allow \PDOException
        $rows = $this->db->fetchAll($sql, $bindVals);
        if ($isFetchOne) {
            $out = $rows ? $this->makeContentNode($rows[0], $rows) : null;
        } else {
            $out = $rows ? array_map(function ($row) use ($rows) {
                return $this->makeContentNode($row, $rows);
            }, $rows) : [];
        }
        //
        if ($out && $join) {
            $out = $this->runUserDefinedJoinCollector($join,
				$rows, $isFetchOne, $out);
		}
        //
        if (isset($this->frontendPanelInfos[$queryId])) {
            $this->frontendPanelInfos[$queryId]->contentNodes = $out;
        }
        //
        return $out;
    }
    /**
     * @return array Array<{id: string, impl: string, ...}>
     */
    public function getFrontendPanelInfos() {
        return array_values($this->frontendPanelInfos);
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     * @throws \Pike\PikeException
     */
    public function getContentType($name) {
        if (!($type = $this->contentTypes->find($name)))
            throw new PikeException("Content type `{$name}` not registered",
                                    PikeException::BAD_INPUT);
        return $type;
    }
    /**
     * @return object
     */
    private function makeContentNode($row, $rows) {
        $out = (object)$row;
        unset($out->revisionSnapshot);
        $out->isPublished = (bool)$out->isPublished;
        $out->isRevision = false;
        $out->revisions = [];
        if (!$this->fetchRevisions) return $out;
        //
        foreach ($rows as $row) {
            if (!$row['revisionSnapshot'] ||
                $row['id'] !== $out->id ||
                $row['contentType'] !== $out->contentType) continue;
            $out->revisions[] = (object)[
                'createdAt' => $row['revisionCreatedAt'],
                'snapshot' => json_decode($row['revisionSnapshot'])
            ];
        }
        $out->isRevision = !empty($out->revisions);
        usort($out->revisions, function ($a, $b) {
            return $b->createdAt - $a->createdAt;
        });
        return $out;
    }
    private function runUserDefinedJoinCollector($join, $rows, $isFetchOne, &$out) {
        $joinContentTypeName = $join->contentType;
        $joinIdKey = $join->alias . 'Id';
        $joinContentTypeKey = $join->alias . 'ContentType';
        [$fn, $fieldName] = $join->collector;
        //
        $processed = [];
        foreach (($isFetchOne ? [$out] : $out) as $node) {
            if (!array_key_exists($node->id, $processed)) {
                $node->$fieldName = [];
                foreach ($rows as $row) {
                    if (
                        $row[$joinIdKey] &&
                        $row['id'] === $node->id &&
                        $row[$joinContentTypeKey] === $joinContentTypeName
                    ) $fn($node, $row);
                }
                $processed[$node->id] = $node;
            }
        }
        //
        return $isFetchOne ? reset($processed) : array_values($processed);
    }
    /**
     * 'Foo f' -> ['foo', 'f'] tai 'Foo' -> ['Foo', <defaultAlias>]
     *
     * @param string $expr
     * @param string $defaultAlias = 'a'
     */
    public static function parseContentTypeNameAndAlias($expr, $defaultAlias = 'a') {
        $pcs = explode(' ', $expr);
        return [$pcs[0], $pcs[1] ?? $defaultAlias];
    }
}

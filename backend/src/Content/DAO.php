<?php

namespace RadCms\Content;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Common\RadException;

class DAO {
    public $useRevisions;
    protected $db;
    protected $counter;
    protected $frontendPanelInfos;
    protected $contentTypes;
    /**
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param bool $useRevisions = false
     */
    public function __construct(Db $db,
                                ContentTypeCollection $contentTypes,
                                $useRevisions = false) {
        $this->db = $db;
        $this->contentTypes = $contentTypes;
        $this->counter = 0;
        $this->frontendPanelInfos = [];
        $this->useRevisions = $useRevisions;
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne($contentTypeName) {
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        return new Query(++$this->counter, $type, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        // @allow \RadCms\Common\RadException
        $type = $this->getContentType($contentTypeName);
        return new Query(++$this->counter, $type, false, $this);
    }
    /**
     * @param string $queryId
     * @param string $contentTypeName
     * @param string $implName
     * @param string $title = ''
     */
    public function addFrontendPanelInfo($queryId, $contentTypeName, $implName, $title) {
        $this->frontendPanelInfos[$queryId] = (object)[
            'id' => $queryId,
            'impl' => $implName,
            'title' => $title,
            'contentTypeName' => $contentTypeName,
            'contentNodes' => null,
        ];
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
        if ($out && $join)
            $this->provideRowsToUserDefinedJoinCollector($join,
                $rows, $isFetchOne, $out);
        //
        if (isset($this->frontendPanelInfos[$queryId])) {
            $this->frontendPanelInfos[$queryId]->contentNodes = $out;
        }
        return $out;
    }
    /**
     * @return array Array<{id: string; impl: string; ...}>
     */
    public function getFrontendPanelInfos() {
        return array_values($this->frontendPanelInfos);
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     * @throws \RadCms\Common\RadException
     */
    public function getContentType($name) {
        if (!($type = $this->contentTypes->find($name)))
            throw new RadException("Content type `{$name}` not registered",
                                   RadException::BAD_INPUT);
        return $type;
    }
    /**
     * @return object
     */
    private function makeContentNode($row, $rows) {
        $head = (object)$row;
        unset($head->revisionSnapshot);
        if (!$this->useRevisions) return $head;
        //
        $revs = [];
        $latest = (object)['time' => 0, 'index' => 0];
        foreach ($rows as $row) {
            if (!$row['revisionSnapshot'] ||
                $row['id'] != $head->id ||
                $row['contentType'] != $head->contentType) continue;
            $l = array_push($revs, json_decode($row['revisionSnapshot']));
            if ($row['revisionCreatedAt'] > $latest->time) {
                $latest->time = $row['revisionCreatedAt'];
                $latest->index = $l - 1;
            }
        }
        //
        if ($revs) {
            $out = array_splice($revs, $latest->index, 1)[0];
            $out->revisions = $revs; // kaikki paitsi uusin/splicattu
            $out->id = $head->id;
            return $out;
        }
        return $head;
    }
    private function provideRowsToUserDefinedJoinCollector($join,
                                                           $rows,
                                                           $isFetchOne,
                                                           &$out) {
        $joinContentTypeName = $join->contentType;
        [$fn, $fieldName] = $join->collector;
        foreach (($isFetchOne ? [$out] : $out) as $node) {
            $node->$fieldName = [];
            foreach ($rows as $row) {
                if (
                    $row['id'] == $node->id &&
                    $row['bContentType'] == $joinContentTypeName
                ) $fn($node, $row);
            }
        }
    }
}

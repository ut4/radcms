<?php

namespace RadCms\Content;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;

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
        if (!($type = $this->getContentType($contentTypeName))) return;
        return new Query(++$this->counter, $type, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        if (!($type = $this->getContentType($contentTypeName))) return;
        return new Query(++$this->counter, $type, false, $this);
    }
    /**
     * @param string $queryId
     * @param string $panelType
     * @param string $title = ''
     */
    public function addFrontendPanelInfo($queryId, $panelType, $title) {
        $this->frontendPanelInfos[$queryId] = (object)[
            'id' => $queryId,
            'type' => $panelType,
            'title' => $title,
            'contentNodes' => null
        ];
    }
    /**
     * @param string $sql
     * @param string $queryId
     * @param bool $isFetchOne
     * @return array|object|null
     */
    public function doExec($sql, $queryId, $isFetchOne) {
        $out = null;
        $rows = $this->db->fetchAll($sql);
        if ($isFetchOne) {
            $out = $rows ? $this->makeContentNode($rows[0], $rows) : null;
        } else {
            $out = $rows ? array_map(function ($row) use ($rows) {
                return $this->makeContentNode($row, $rows);
            }, $rows) : [];
        }
        if (isset($this->frontendPanelInfos[$queryId])) {
            $this->frontendPanelInfos[$queryId]->contentNodes = $out;
        }
        return $out;
    }
    /**
     * @return array Array<{id: string; type: string; ...}>
     */
    public function getFrontendPanelInfos() {
        return array_values($this->frontendPanelInfos);
    }
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     * @throws \InvalidArgumentException
     */
    protected function getContentType($name) {
        if (!($type = $this->contentTypes->find($name)))
            throw new \InvalidArgumentException("Content type `{$name}` not registered");
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
            if ($row['createdAt'] > $latest->time) {
                $latest->time = $row['createdAt'];
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
}

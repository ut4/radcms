<?php

namespace RadCms\Content;

use RadCms\Common\Db;

class DAO {
    private $db;
    private $counter;
    private $frontendPanelInfos;
    /**
     * @param RadCms\Common\Db $db = null
     */
    public function __construct(Db $db = null) {
        $this->db = $db;
        $this->counter = 0;
        $this->frontendPanelInfos = [];
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne($contentTypeName) {
        return new Query(++$this->counter, $contentTypeName, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        return new Query(++$this->counter, $contentTypeName, false, $this);
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
        $fetchResult = null;
        if ($isFetchOne) {
            $row = $this->db->fetchOne($sql);
            $fetchResult = $row ? makeContentNode($row) : null;
        } else {
            $rows = $this->db->fetchAll($sql);
            $fetchResult = is_array($rows) ? array_map('RadCMS\Content\makeContentNode', $rows) : [];
        }
        if (isset($this->frontendPanelInfos[$queryId])) {
            $this->frontendPanelInfos[$queryId]->contentNodes = $fetchResult;
        }
        return $fetchResult;
    }
    /**
     * @return array Array<{id: string; type: string; ...}>
     */
    public function getFrontendPanelInfos() {
        return array_values($this->frontendPanelInfos);
    }
}

/**
 *
 */
function makeContentNode($row) {
    $out = json_decode($row['json']);
    $out->defaults = (object)['id' => $row['id'], 'name' => $row['name']];
    return $out;
}
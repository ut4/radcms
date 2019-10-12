<?php

namespace RadCms\Content;

use RadCms\Common\Db;
use RadCms\Framework\GenericArray;

class DAO {
    private $db;
    private $contentTypes;
    private $counter;
    private $frontendPanelInfos;
    /**
     * @param \RadCms\Framework\GenericArray $contentTypes = null Array<ContentTypeDef>
     * @param \RadCms\Common\Db $db = null
     */
    public function __construct(GenericArray $contentTypes, Db $db = null) {
        $this->contentTypes = $contentTypes;
        $this->db = $db;
        $this->counter = 0;
        $this->frontendPanelInfos = [];
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\Content\Query
     */
    public function fetchOne($contentTypeName) {
        if (!($type = $this->contentTypes->find('name', $contentTypeName)))
            throw new \InvalidArgumentException("Content type `{$contentTypeName}` not registered");
        return new Query(++$this->counter, $type, true, $this);
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\Content\Query
     */
    public function fetchAll($contentTypeName) {
        if (!($type = $this->contentTypes->find('name', $contentTypeName)))
            throw new \InvalidArgumentException("Content type `{$contentTypeName}` not registered");
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
        if ($isFetchOne) {
            $row = $this->db->fetchOne($sql);
            $out = $row ? makeContentNode($row) : null;
        } else {
            $rows = $this->db->fetchAll($sql);
            $out = is_array($rows) ? array_map('RadCMS\Content\makeContentNode', $rows) : [];;
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
}

/**
 *
 */
function makeContentNode($row) {
    return (object)$row;
}
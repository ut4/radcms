<?php

namespace RadCms\Content;

use RadCms\Framework\Db;
use RadCms\ContentType\ContentTypeCollection;

class DAO {
    protected $db;
    protected $counter;
    protected $frontendPanelInfos;
    protected $contentTypes;
    /**
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     */
    public function __construct(Db $db, ContentTypeCollection $contentTypes) {
        $this->db = $db;
        $this->contentTypes = $contentTypes;
        $this->counter = 0;
        $this->frontendPanelInfos = [];
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
    /**
     * @return \RadCms\ContentType\ContentTypeDef
     * @throws \InvalidArgumentException
     */
    protected function getContentType($name) {
        if (!($type = $this->contentTypes->find($name)))
            throw new \InvalidArgumentException("Content type `{$name}` not registered");
        return $type;
    }
}

/**
 *
 */
function makeContentNode($row) {
    return (object)$row;
}
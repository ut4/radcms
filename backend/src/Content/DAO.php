<?php

namespace RadCms\Content;

use RadCms\Common\Db;

class DAO {
    private $db;
    private $contentTypeName;
    private $isFetchOne;
    private $whereExpr;
    private $orderByExpr;
    private $limitExpr;
    /**
     * @param RadCms\Common\Db $db = null
     */
    public function __construct(Db $db = null) {
        $this->db = $db;
    }
    /**
     * @param string $contentTypeName
     * @return $this
     */
    public function fetchOne($contentTypeName) {
        $this->newQuery($contentTypeName, true);
        return $this;
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return $this
     */
    public function fetchAll($contentTypeName) {
        $this->newQuery($contentTypeName, false);
        return $this;
    }
    /**
     * @param string $expr
     * @return $this
     */
    public function where($expr) {
        $this->whereExpr = $expr;
        return $this;
    }
    /**
     * @return array|object|null
     */
    public function exec() {
        if ($this->isFetchOne) {
            $row = $this->db->fetchOne($this->toSql());
            return $row ? makeContentNode($row) : null;
        }
        $rows = $this->db->fetchAll($this->toSql());
        return is_array($rows) ? array_map('RadCMS\Content\makeContentNode', $rows) : [];
    }
    /**
     * @return string
     * @throws \RuntimeException
     */
    public function toSql() {
        if (($errors = $this->selfValidate()) != '') {
            throw new \RuntimeException($errors);
        }
        $where = '';
        if ($this->isFetchOne) {
            $where = $this->whereExpr;
        } else {
            $where = '`contentTypeId` = (select `id` from ${p}contentTypes where `name` = \'' .
                        $this->contentTypeName . '\')' .
                      (!$this->whereExpr ? '' : ' and ' . $this->whereExpr);
        }
        return 'select `id`,`name`,`json` from ${p}contentNodes where ' .
                $where .
                (!$this->orderByExpr ? '' : ' order by ' . $this->orderByExpr) .
                (!$this->limitExpr ? '' : ' limit ' . $this->limitExpr);
    }
    /**
     * .
     */
    private function newQuery($contentTypeName, $isFetchOne) {
        $this->contentTypeName = $contentTypeName;
        $this->isFetchOne = $isFetchOne;
        $this->whereExpr = null;
        $this->orderByExpr = null;
        $this->limitExpr = null;
    }
    /**
     * @return string
     */
    private function selfValidate() {
        $errors = [];
        $MAX_CNT_TYPE_NAME_LEN = 64;
        $MAX_WHERE_LEN = 2048;
        if (!$this->contentTypeName) {
            array_push($errors, 'contentTypeName is required');
        } else if (mb_strlen($this->contentTypeName) > $MAX_CNT_TYPE_NAME_LEN) {
            array_push($errors, 'contentTypeName too long (max ' .
                $MAX_CNT_TYPE_NAME_LEN . ', was ' . mb_strlen($this->contentTypeName) . ').');
        }
        if ($this->isFetchOne) {
            if (!$this->whereExpr) {
                array_push($errors, 'fetchOne(...)->where() is required.');
            } else if (mb_strlen($this->whereExpr) > $MAX_WHERE_LEN) {
                array_push($errors, 'fetchOne(...)->where() too long (max ' .
                $MAX_WHERE_LEN . ', was ' . mb_strlen($this->whereExpr) . ').');
            }
        }
        return $errors ? implode('\n', $errors) : '';
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
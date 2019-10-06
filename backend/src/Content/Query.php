<?php

namespace RadCms\Content;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class Query {
    private $id;
    private $isFetchOne;
    private $dao;
    private $contentTypeName;
    private $whereExp;
    private $orderByExp;
    private $limitExp;
    /**
     * $param integer $id
     * $param string $contentTypeName
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct($id, $contentTypeName, $isFetchOne, DAO $dao) {
        $this->id = strval($id);
        $this->contentTypeName = $contentTypeName;
        $this->isFetchOne = $isFetchOne;
        $this->dao = $dao;
        $this->whereExpr = null;
        $this->orderByExpr = null;
        $this->limitExpr = null;
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
     * @param string $panelType
     * @param string $title = ''
     * @return $this
     */
    public function createFrontendPanel($panelType, $title = '') {
        $this->dao->addFrontendPanelInfo($this->id, $panelType,
            $title ? $title : $this->contentTypeName);
        return $this;
    }
    /**
     * @return array|object|null
     */
    public function exec() {
        return $this->dao->doExec($this->toSql(), $this->id, $this->isFetchOne);
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

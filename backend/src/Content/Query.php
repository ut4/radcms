<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeDef;
use RadCms\ContentType\ContentTypeValidator;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class Query {
    private $id;
    private $isFetchOne;
    private $dao;
    private $contentType;
    private $whereExp;
    private $orderByExp;
    private $limitExp;
    /**
     * $param integer $id
     * $param \RadCms\ContentType\ContentTypeDef $contentType
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct($id, ContentTypeDef $contentType, $isFetchOne, DAO $dao) {
        $this->id = strval($id);
        $this->contentType = $contentType;
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
            $title ? $title : $this->contentType->name);
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
        return 'SELECT `id`, ' . $this->contentType->fieldsToSql() .
               ' FROM ${p}' . $this->contentType->name .
               (!$this->whereExpr ? '' : ' WHERE ' . $this->whereExpr) .
               (!$this->orderByExpr ? '' : ' ORDER BY ' . $this->orderByExpr) .
               (!$this->limitExpr ? '' : ' LIMIT ' . $this->limitExpr);
    }
    /**
     * @return string
     */
    private function selfValidate() {
        $MAX_WHERE_LEN = 2048;
        $errors = ContentTypeValidator::validate($this->contentType);
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
<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeDef;
use RadCms\ContentType\ContentTypeValidator;
use RadCms\Common\RadException;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class Query {
    private $id;
    private $contentType;
    private $isFetchOne;
    private $dao;
    private $whereExpr;
    private $orderByExpr;
    private $limitExpr;
    private $joinDef;
    private $collector;
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
     * @param string $contentType
     * @param string $expr
     * @param bool $isLeft = false
     * @return $this
     */
    public function join($contentType, $expr, $isLeft = false) {
        $this->joinDef = (object)['contentType' => $contentType,
                                  'expr' => $expr,
                                  'isLeft' => $isLeft];
        return $this;
    }
    /**
     * @param string $contentType
     * @param string $expr
     * @return $this
     */
    public function leftJoin($contentType, $expr) {
        return $this->join($contentType, $expr, true);
    }
    /**
     * @param string $toField
     * @param \Closure $fn
     * @return array|object|null
     */
    public function collectJoin($toField, \Closure $fn) {
        $this->collector = [$fn, $toField];
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
        return $this->dao->doExec($this->toSql(), $this->id, $this->isFetchOne,
                                  $this->collector);
    }
    /**
     * @return string
     * @throws \RadCms\Common\RadException
     */
    public function toSql() {
        if (($errors = $this->selfValidate())) {
            throw new RadException($errors, RadException::BAD_INPUT);
        }
        //
        $mainQ = 'SELECT `id`, ' . $this->contentType->fieldsToSql() .
                 ' FROM ${p}' . $this->contentType->name .
                 (!$this->whereExpr ? '' : ' WHERE ' . $this->whereExpr) .
                 (!$this->orderByExpr ? '' : ' ORDER BY ' . $this->orderByExpr) .
                 (!$this->limitExpr ? '' : ' LIMIT ' . $this->limitExpr);
        //
        $joins = [];
        $fields = [];
        if ($this->joinDef) $this->addContentTypeJoin($joins, $fields);
        if ($this->dao->useRevisions) $this->addRevisionsJoin($joins, $fields);
        //
        if (!$joins) {
            return $mainQ;
        }
        return 'SELECT a.*' .
               ', ' . implode(', ', $fields) .
               ' FROM (' . $mainQ . ') AS a' .
               ' ' . implode(' ', $joins);
    }
    /**
     * @param array &$joins
     * @param array &$fields
     */
    private function addContentTypeJoin(&$joins, &$fields) {
        $joins[] = (!$this->joinDef->isLeft ? '' : 'LEFT ') . 'JOIN' .
                    ' ${p}' . $this->joinDef->contentType . ' AS b' .
                    ' ON (' . $this->joinDef->expr . ')';
        $fields[] = 'b.`id` AS `bId`, ' .
                    $this->dao->getContentType($this->joinDef->contentType)
                              ->fieldsToSql(function ($fieldName) {
                                  return 'b.`'.$fieldName.'` AS `b'.ucfirst($fieldName).'`';
                              });
    }
    /**
     * @param array &$joins
     * @param array &$fields
     */
    private function addRevisionsJoin(&$joins, &$fields) {
        $joins[] = 'LEFT JOIN ${p}contentRevisions r ON (r.`contentId` = a.`id`' .
                   ' AND r.`contentType` = \'' . $this->contentType->name . '\')';
        $fields[] = 'r.`revisionSnapshot`, r.`contentType`, r.`createdAt`';
    }
    /**
     * @return string
     */
    private function selfValidate() {
        $MAX_WHERE_LEN = 2048;
        $errors = ContentTypeValidator::validate($this->contentType);
        if ($this->joinDef) {
            $errors = array_merge($errors,
                ContentTypeValidator::validateName($this->joinDef->contentType));
            if (!$this->collector)
                $errors[] = 'join() was used, but no collectJoin(\'field\',' .
                            ' function () {}) was provided';
        }
        if ($this->isFetchOne) {
            if (!$this->whereExpr) {
                $errors[] = 'fetchOne(...)->where() is required.';
            } elseif (mb_strlen($this->whereExpr) > $MAX_WHERE_LEN) {
                $errors[] = 'fetchOne(...)->where( too long (max ' .
                            $MAX_WHERE_LEN . ', was ' .
                            mb_strlen($this->whereExpr) . ').';
            }
        }
        return $errors ? implode('\n', $errors) : '';
    }
}

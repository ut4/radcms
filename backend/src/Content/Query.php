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
    private $joinDefs;
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
        $this->joinDefs = [];
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
        $this->joinDefs[] = (object)['contentType' => $contentType,
                                     'expr' => $expr,
                                     'isLeft' => $isLeft,
                                     'collector' => null];
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
     * @return $this
     */
    public function collectJoin($toField, \Closure $fn) {
        $joinDef = $this->joinDefs[count($this->joinDefs) - 1];
        $joinDef->collector = [$fn, $toField];
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
                                  $this->joinDefs[0] ?? null);
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
        $mainQ = 'SELECT `id`, ' .
                 $this->contentType->fieldsToSql() .
                 ', \'' . $this->contentType->name . '\' AS `contentType`' .
                 ' FROM ${p}' . $this->contentType->name .
                 (!$this->whereExpr ? '' : ' WHERE ' . $this->whereExpr) .
                 (!$this->orderByExpr ? '' : ' ORDER BY ' . $this->orderByExpr) .
                 (!$this->limitExpr ? '' : ' LIMIT ' . $this->limitExpr);
        //
        $joins = [];
        $fields = [];
        if ($this->joinDefs) $this->addContentTypeJoin($this->joinDefs[0], $joins, $fields);
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
     * @param object $joinDef { $contentType: string; $expr: string; $isLeft: bool; }
     * @param array &$joins
     * @param array &$fields
     */
    private function addContentTypeJoin($joinDef, &$joins, &$fields) {
        $ctypeName = $joinDef->contentType;
        $joins[] = (!$joinDef->isLeft ? '' : 'LEFT ') . 'JOIN' .
                    ' ${p}' . $ctypeName . ' AS b' .
                    ' ON (' . $joinDef->expr . ')';
        $fields[] = 'b.`id` AS `bId`, \'' . $ctypeName . '\' AS `bContentType`, ' .
                    $this->dao->getContentType($ctypeName)
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
        $fields[] = 'r.`revisionSnapshot`, r.`createdAt` AS `revisionCreatedAt`';
    }
    /**
     * @return string
     */
    private function selfValidate() {
        $MAX_WHERE_LEN = 2048;
        $errors = ContentTypeValidator::validate($this->contentType);
        foreach ($this->joinDefs as $d) {
            $errors = array_merge($errors,
                ContentTypeValidator::validateName($d->contentType));
            if (!$d->collector)
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

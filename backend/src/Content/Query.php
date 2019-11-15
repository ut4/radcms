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
    private $whereDef;
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
     * @param array $bindVals = null
     * @return $this
     */
    public function where($expr, array $bindVals = null) {
        $this->whereDef = (object)['expr' => $expr, 'bindVals' => $bindVals];
        return $this;
    }
    /**
     * @param string $contentType
     * @param string $expr
     * @param array $bindVals = null
     * @param bool $isLeft = false
     * @return $this
     */
    public function join($contentType,
                         $expr,
                         array $bindVals = null,
                         $isLeft = false) {
        $this->joinDefs[] = (object)['contentType' => $contentType,
                                     'expr' => $expr,
                                     'bindVals' => $bindVals,
                                     'isLeft' => $isLeft,
                                     'collector' => null];
        return $this;
    }
    /**
     * @param string $contentType
     * @param string $expr
     * @param array $bindVals = null
     * @return $this
     */
    public function leftJoin($contentType, $expr, array $bindVals = null) {
        return $this->join($contentType, $expr, $bindVals, true);
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
        $this->dao->addFrontendPanelInfo($this->id, $this->contentType->name, $panelType,
            $title ? $title : $this->contentType->name);
        return $this;
    }
    /**
     * @return array|object|null
     */
    public function exec() {
        $bindVals = [];
        if ($this->whereDef && $this->whereDef->bindVals)
            $bindVals = array_merge($bindVals, $this->whereDef->bindVals);
        foreach ($this->joinDefs as $d)
            if ($d->bindVals) $bindVals = array_merge($bindVals, $d->bindVals);
        //
        return $this->dao->doExec($this->toSql(), $this->id, $this->isFetchOne,
                                  $bindVals ?? null, $this->joinDefs[0] ?? null);
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
                 $this->contentType->fields->toSqlCols() .
                 ', \'' . $this->contentType->name . '\' AS `contentType`' .
                 ' FROM ${p}' . $this->contentType->name .
                 (!$this->whereDef ? '' : ' WHERE ' . $this->whereDef->expr) .
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
                    $this->dao->getContentType($ctypeName)->fields
                              ->toSqlCols(function ($f) {
                                  return 'b.`'.$f->name.'` AS `b'.ucfirst($f->name).'`';
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
        $errors = ContentTypeValidator::validate($this->contentType);
        foreach ($this->joinDefs as $d) {
            $errors = array_merge($errors,
                ContentTypeValidator::validateName($d->contentType));
            if (!$d->collector)
                $errors[] = 'join() was used, but no collectJoin(\'field\',' .
                            ' function () {}) was provided';
        }
        if ($this->isFetchOne) {
            if (!$this->whereDef) {
                $errors[] = 'fetchOne(...)->where() is required.';
            }
        }
        return $errors ? implode('\n', $errors) : '';
    }
}

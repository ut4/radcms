<?php

namespace RadCms\Content;

use RadCms\ContentType\ContentTypeDef;
use RadCms\ContentType\ContentTypeValidator;
use Pike\PikeException;

/**
 * Luokka jonka templaattien <?php $this->fetchOne|All() ?> instansoi ja
 * palauttaa. Ei tarkoitettu käytettäväksi manuaalisesti.
 */
class Query {
    private $id;
    private $contentType;
    private $contentTypeAlias;
    private $isFetchOne;
    private $dao;
    private $whereDef;
    private $orderByExpr;
    private $limitExpr;
    private $joinDefs;
    /**
     * $param integer $id
     * $param \RadCms\ContentType\ContentTypeDef $contentType
     * $param string $contentTypeAlias
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct($id,
                                ContentTypeDef $contentType,
                                $contentTypeAlias,
                                $isFetchOne,
                                DAO $dao) {
        $this->id = strval($id);
        $this->contentType = $contentType;
        $this->contentTypeAlias = $contentTypeAlias;
        $this->isFetchOne = $isFetchOne;
        $this->dao = $dao;
        $this->joinDefs = [];
    }
    /**
     * @param string $expr
     * @param mixed ...$bindVals
     * @return $this
     */
    public function where($expr, ...$bindVals) {
        $this->whereDef = (object)['expr' => $expr, 'bindVals' => $bindVals];
        return $this;
    }
    /**
     * @param string $contentType 'Products', 'Products p'
     * @param string $expr
     * @param mixed ...$bindVals
     * @return $this
     */
    public function join($contentType, $expr, ...$bindVals) {
        return $this->doJoin($contentType, $expr, $bindVals, false);
    }
    /**
     * @param string $contentType 'Products', 'Products p'
     * @param string $expr
     * @param mixed ...$bindVals
     * @return $this
     */
    public function leftJoin($contentType, $expr, ...$bindVals) {
        return $this->doJoin($contentType, $expr, $bindVals, true);
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
     * @param int $limit
     * @param int $offset = null
     * @return $this
     */
    public function limit($limit, $offset = null) {
        $this->limitExpr = $offset === null ? (string)$limit : "{$offset}, {$limit}";
        return $this;
    }
    /**
     * @param string $panelType
     * @param string $title = ''
     * @param string $highlightSelector = ''
     * @return $this
     */
    public function createFrontendPanel($panelType, $title = '', $highlightSelector = '') {
        $this->dao->addFrontendPanelInfo($this->id, $this->contentType->name, $panelType,
            $title ? $title : $this->contentType->name, $highlightSelector);
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
     * @throws \Pike\PikeException
     */
    public function toSql() {
        if (($errors = $this->selfValidate())) {
            throw new PikeException($errors, PikeException::BAD_INPUT);
        }
        //
        $mainQ = 'SELECT `id`, `isPublished`, ' .
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
        if ($this->dao->fetchRevisions) $this->addRevisionsJoin($joins, $fields);
        //
        if (!$joins) {
            return $mainQ;
        }
        return 'SELECT ' . $this->contentTypeAlias . '.*' .
               ', ' . implode(', ', $fields) .
               ' FROM (' . $mainQ . ') AS ' . $this->contentTypeAlias .
               ' ' . implode(' ', $joins);
    }
    /**
     * @param string $contentType 'Products', 'Products p'
     * @param string $expr
     * @param array $bindVals
     * @param bool $isLeft
     * @return $this
     */
    private function doJoin($contentType, $expr, $bindVals, $isLeft) {
        [$contentTypeName, $alias] = DAO::parseContentTypeNameAndAlias($contentType, 'b');
        $this->joinDefs[] = (object)['contentType' => $contentTypeName,
                                     'alias' => $alias,
                                     'expr' => $expr,
                                     'bindVals' => $bindVals,
                                     'isLeft' => $isLeft,
                                     'collector' => null];
        return $this;
    }
    /**
     * @param object $joinDef {contentType: string, expr: string, isLeft: bool}
     * @param string[] &$joins
     * @param string[] &$fields
     */
    private function addContentTypeJoin($joinDef, &$joins, &$fields) {
        $ctypeName = $joinDef->contentType;
        $a = $joinDef->alias;
        $joins[] = (!$joinDef->isLeft ? '' : 'LEFT ') . 'JOIN' .
                    ' ${p}' . $ctypeName . ' AS ' . $joinDef->alias .
                    ' ON (' . $joinDef->expr . ')';
        $fields[] = "{$a}.`id` AS `{$a}Id`, '{$ctypeName}' AS `{$a}ContentType`, " .
                    $this->dao->getContentType($ctypeName)->fields
                              ->toSqlCols(function ($f) use ($a) {
                                  return $a.'.`'.$f->name.'` AS `'.$a.ucfirst($f->name).'`';
                              });
    }
    /**
     * @param string[] &$joins
     * @param string[] &$fields
     */
    private function addRevisionsJoin(&$joins, &$fields) {
        $joins[] = 'LEFT JOIN ${p}contentRevisions _r' .
                   ' ON (_r.`contentId` = ' . $this->contentTypeAlias . '.`id`' .
                   ' AND _r.`contentType` = \'' . $this->contentType->name . '\')';
        $fields[] = '_r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`';
    }
    /**
     * @return string
     */
    private function selfValidate() {
        $errors = ContentTypeValidator::validate($this->contentType);
        if (!ctype_alnum(str_replace(['_'], '', $this->contentTypeAlias)))
            $errors[] = "fetch alias ({$this->contentTypeAlias}) must contain only a-zA-Z_";
        foreach ($this->joinDefs as $d) {
            $errors = array_merge($errors,
                ContentTypeValidator::validateName($d->contentType));
            if (!ctype_alnum(str_replace(['_'], '', $d->alias)))
                $errors[] = "join alias ({$d->alias}) must contain only a-zA-Z_";
            if (!$d->collector)
                $errors[] = 'join() was used, but no collectJoin(\'field\',' .
                            ' function () {}) was provided';
        }
        if ($this->isFetchOne) {
            if (!$this->whereDef) {
                $errors[] = 'fetchOne(...)->where() is required';
            }
        }
        if ($this->limitExpr &&
            !ctype_digit(str_replace([',', ' '], '', $this->limitExpr)))
                $errors[] = "limit expression `{$this->limitExpr}` not valid";
        return $errors ? implode('\n', $errors) : '';
    }
}

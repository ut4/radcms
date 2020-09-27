<?php

declare(strict_types=1);

namespace RadCms\Content;

use Pike\{PikeException, Validation};
use RadCms\ContentType\{ContentTypeDef, ContentTypeValidator};

/**
 * Luokka jonka DAO->fetchOne|All() instansoi ja palauttaa. Ei tarkoitettu
 * käytettäväksi manuaalisesti.
 */
class Query {
    public const DIRECTION_ASC  = 'asc';
    public const DIRECTION_DESC = 'desc';
    public const DIRECTION_RAND = 'rand';
    /** @var \RadCms\ContentType\ContentTypeDef */
    protected $contentType;
    /** @var string */
    protected $contentTypeAlias;
    /** @var bool */
    protected $isFetchOne;
    /** @var \RadCms\Content\DAO */
    protected $dao;
    /** @var object */
    protected $whereDef;
    /** @var object */
    protected $orderDef;
    /** @var string */
    protected $limitExpr;
    /** @var object[] */
    protected $joinDefs;
    /**
     * $param \RadCms\ContentType\ContentTypeDef $contentType
     * $param string $contentTypeAlias
     * $param bool $isFetchOne
     * $param \RadCms\Content\DAO $dao
     */
    public function __construct(ContentTypeDef $contentType,
                                string $contentTypeAlias,
                                bool $isFetchOne,
                                DAO $dao) {
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
    public function where(string $expr, ...$bindVals): Query {
        $this->whereDef = (object)['expr' => $expr, 'bindVals' => $bindVals];
        return $this;
    }
    /**
     * @param string $contentTypeExpr 'Products', 'Products p'
     * @param string $expr
     * @param mixed ...$bindVals
     * @return $this
     */
    public function join(string $contentTypeExpr, string $expr, ...$bindVals): Query {
        return $this->doJoin($contentTypeExpr, $expr, $bindVals, false);
    }
    /**
     * @param string $contentTypeExpr 'Products', 'Products p'
     * @param string $expr
     * @param mixed ...$bindVals
     * @return $this
     */
    public function leftJoin(string $contentTypeExpr, string $expr, ...$bindVals): Query {
        return $this->doJoin($contentTypeExpr, $expr, $bindVals, true);
    }
    /**
     * @param string|null $toField
     * @param \Closure $fn
     * @return $this
     */
    public function collectPreviousJoin(?string $toField, \Closure $fn): Query {
        $joinDef = $this->joinDefs[count($this->joinDefs) - 1];
        $joinDef->collectFn = $fn;
        $joinDef->targetFieldName = $toField;
        return $this;
    }
    /**
     * @param string $field
     * @param string $dir = self::DIRECTION_ASC
     * @return $this
     */
    public function orderBy(string $field, string $dir = self::DIRECTION_ASC): Query {
        $this->orderDef = (object)['field' => $field, 'dir' => $dir];
        return $this;
    }
    /**
     * @param int $limit
     * @param int $offset = null
     * @return $this
     */
    public function limit(int $limit, int $offset = null): Query {
        $this->limitExpr = $offset === null ? (string) $limit : "{$offset}, {$limit}";
        return $this;
    }
    /**
     * @return array|\stdClass|null
     */
    public function exec() {
        $bindVals = [];
        if ($this->whereDef && $this->whereDef->bindVals)
            $bindVals = array_merge($bindVals, $this->whereDef->bindVals);
        foreach ($this->joinDefs as $d)
            if ($d->bindVals) $bindVals = array_merge($bindVals, $d->bindVals);
        //
        return $this->dao->doExec($this->toSql(), $this->isFetchOne,
                                  $bindVals ?? null, $this->joinDefs,
                                  $this->orderDef ? $this->orderDef->dir : null);
    }
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function toSql(): string {
        if (($errors = $this->selfValidate())) {
            throw new PikeException($errors, PikeException::BAD_INPUT);
        }
        //
        $mainQ = 'SELECT `id`, `status`, ' .
                 $this->contentType->fields->toSqlCols() .
                 ', \'' . $this->contentType->name . '\' AS `contentType`' .
                 ' FROM `${p}' . $this->contentType->name . '`' .
                 (!$this->whereDef ? '' : ' WHERE ' . $this->whereDef->expr) .
                 (!$this->orderDef ? '' : ' ORDER BY ' . $this->makeOrderExpr()) .
                 (!$this->limitExpr ? '' : ' LIMIT ' . $this->limitExpr);
        //
        $joins = [];
        $fields = [];
        foreach ($this->joinDefs as $def)
            $this->addContentTypeJoin($def, $joins, $fields);
        if ($this->dao->fetchRevisions)
            $this->addRevisionsJoin($joins, $fields);
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
     * @param string $contentTypeExpr 'Products', 'Products p'
     * @param string $expr
     * @param array $bindVals
     * @param bool $isLeft
     * @return $this
     */
    private function doJoin(string $contentTypeExpr,
                            string $expr,
                            array $bindVals,
                            bool $isLeft): Query {
        [$contentTypeName, $alias] = DAO::parseContentTypeNameAndAlias($contentTypeExpr, 'b');
        $this->joinDefs[] = (object)['contentTypeName' => $contentTypeName,
                                     'alias' => $alias,
                                     'expr' => $expr,
                                     'bindVals' => $bindVals,
                                     'isLeft' => $isLeft,
                                     'collectFn' => null,
                                     'targetFieldName' => null];
        return $this;
    }
    /**
     * @param \stdClass $joinDef
     * @param string[] &$joins
     * @param string[] &$fields
     */
    private function addContentTypeJoin(\stdClass $joinDef,
                                        array &$joins,
                                        array &$fields): void {
        $ctypeName = $joinDef->contentTypeName;
        $a = $joinDef->alias;
        $joins[] = (!$joinDef->isLeft ? '' : 'LEFT ') . 'JOIN' .
                    ' `${p}' . $ctypeName . '` AS ' . $joinDef->alias .
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
    private function addRevisionsJoin(array &$joins, array &$fields): void {
        $joins[] = 'LEFT JOIN ${p}contentRevisions _r' .
                   ' ON (_r.`contentId` = ' . $this->contentTypeAlias . '.`id`' .
                   ' AND _r.`contentType` = \'' . $this->contentType->name . '\')';
        $fields[] = '_r.`revisionSnapshot`, _r.`createdAt` AS `revisionCreatedAt`';
    }
    /**
     * @return string
     */
    private function selfValidate(): string {
        $errors = ContentTypeValidator::validate($this->contentType);
        if (!Validation::isIdentifier($this->contentTypeAlias))
            $errors[] = "fetch alias ({$this->contentTypeAlias}) is not valid";
        $seenAliases = [];
        $seenTargetFields = [];
        foreach ($this->joinDefs as $d) {
            $errors = array_merge($errors,
                ContentTypeValidator::validateName($d->contentTypeName));
            if (!Validation::isIdentifier($d->alias))
                $errors[] = "join alias ({$d->alias}) is not valid";
            elseif ($d->alias === $this->contentTypeAlias ||
                    array_key_exists($d->alias, $seenAliases))
                $errors[] = "can't use join alias ({$d->alias}) more than once";
            if ($d->targetFieldName) {
                if (array_key_exists($d->targetFieldName, $seenTargetFields))
                    $errors[] = "can't use join targetField ({$d->targetFieldName}) more than once";
                $seenTargetFields[$d->targetFieldName] = 1;
            }
            $seenAliases[$d->alias] = 1;
        }
        //
        if ($this->isFetchOne && !$this->whereDef)
            $errors[] = 'fetchOne(...)->where() is required';
        //
        if (($def = $this->orderDef ?? null)) {
            if (!Validation::isIdentifier(str_replace(['.', '`'], '', $def->field)))
                $errors[] = "orderBy field ({$def->field}) not valid";
            if ($def->dir !== self::DIRECTION_ASC &&
                $def->dir !== self::DIRECTION_DESC &&
                $def->dir !== self::DIRECTION_RAND)
                $errors[] = 'orderBy direction (' . $def->dir . ') must be `' . self::DIRECTION_ASC .
                            '`, `' . self::DIRECTION_DESC . '` or `' . self::DIRECTION_RAND . '`';
        }
        //
        if ($this->limitExpr &&
            !ctype_digit(str_replace([',', ' '], '', $this->limitExpr)))
                $errors[] = "limit expression ({$this->limitExpr}) not valid";
        //
        return $errors ? implode('\n', $errors) : '';
    }
    /**
     * @access private
     */
    private function makeOrderExpr(): string {
        switch ($this->orderDef->dir) {
        case self::DIRECTION_DESC:
            return "{$this->orderDef->field} DESC";
        case self::DIRECTION_RAND:
            return "RAND()";
        default:
            return "{$this->orderDef->field} ASC";
        }
    }
}

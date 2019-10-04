<?php

namespace RadCms;

class DBC {
    public $id;
    private $contentTypeName;
    private $isFetchAll;
    private $ddc;
    private $whereExpr;
    private $orderByExpr;
    private $limitExpr;
    /**
     * @param string $contentTypeName
     * @param boolean $isFetchAll
     * @param integer $id
     * @param DDC $ddc
     */
    public function __construct($contentTypeName, $isFetchAll, $id, $ddc) {
        $this->contentTypeName = $contentTypeName;
        $this->isFetchAll = $isFetchAll;
        $this->id = $id;
        $this->ddc = $ddc;
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
     * @param string $expr '`someField` asc'
     * @return $this
     */
    public function orderBy($expr) {
        $this->orderByExpr = $expr;
        return $this;
    }
    /**
     * @param string $expr '1' or '10 offset 80'
     * @return $this
     */
    public function limit($expr) {
        $this->limitExpr = $expr;
        return $this;
    }
    /**
     * @return array
     */
    public function exec() {
        $footer = (object) ['content' => 'Hello'];
        $art1 = (object) ['title' => 'Art1', 'body' => '...1', 'defaults' => (object)['name' => 'art1']];
        $art2 = (object) ['title' => 'Art2', 'body' => '...2', 'defaults' => (object)['name' => 'art2']];
        if ($this->ddc->batches[0]->whereExpr == "name='footer'") {
            return $footer;
        }
        if ($this->ddc->batches[0]->isFetchAll) // main-layout
            return [
                [
                    $art1,
                    $art2,
                ],
                $footer
            ];
        // article-layout
        return [$this->ddc->batches[0]->whereExpr == 'name=\'art1\'' ? $art1 : $art2, $footer];
    }
    /**
     * @return string
     * @throws \RuntimeException
     */
    public function toSql() {
        if (($errors = $this->selfValidate())) {
            throw new \RuntimeException($errors);
        }
        $tail = '';
        if ($this->orderByExpr) {
            $tail .= ' order by ' . $this->orderByExpr;
        }
        if ($this->limitExpr) {
            $tail .= ' limit ' . $this->limitExpr;
        }
        if (!$this->isFetchAll) {
            return $this->whereExpr . $tail;
        }
        return '`contentTypeId` = (select `id` from contentTypes where `name` = \'' .
                                   $this->contentTypeName . '\')' .
                (!$this->whereExpr ? '' : ' and ' . $this->whereExpr) . $tail;
    }
    /**
     * @param string $contentTypeName
     * @return $this
     */
    public function fetchOne($contentTypeName) {
        return $this->ddc->fetchOne($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return $this
     */
    public function fetchAll($contentTypeName) {
        return $this->ddc->fetchAll($contentTypeName);
    }
    /**
     * @return string|null
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
        if (!$this->isFetchAll) {
            if (!$this->whereExpr) {
                array_push($errors, 'fetchOne(...)->where() is required.');
            } else if (mb_strlen($this->whereExpr) > $MAX_WHERE_LEN) {
                array_push($errors, 'fetchOne(...)->where() too long (max ' .
                $MAX_WHERE_LEN . ', was ' . mb_strlen($this->whereExpr) . ').');
            }
        }
        return $errors ? implode('\n', $errors) : null;
    }
}

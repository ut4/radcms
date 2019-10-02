<?php

namespace RadCms;

class DBC {
    private $contentTypeName;
    private $isFetchAll;
    private $id;
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
     * @return DBC
     */
    public function where($expr) {
        $this->whereExpr = $expr;
        return $this;
    }
    /**
     * @return array
     */
    public function exec() {
        $footer = (object) ['content' => 'Hello'];
        $art1 = (object) ['title' => 'Art1', 'body' => '...1', 'defaults' => (object)['name' => 'art1']];
        $art2 = (object) ['title' => 'Art2', 'body' => '...2', 'defaults' => (object)['name' => 'art2']];
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
     * @param string $contentTypeName
     * @return DBC
     */
    public function fetchOne($contentTypeName) {
        return $this->ddc->fetchOne($contentTypeName);
    }
    /**
     * @param string $contentTypeName
     * @return DBC
     */
    public function fetchAll($contentTypeName) {
        return $this->ddc->fetchAll($contentTypeName);
    }
}

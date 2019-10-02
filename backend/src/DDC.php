<?php

namespace RadCms;

class DDC {
    public $batches; // @todo
    private $batchCount;
    /**
     * .
     */
    public function __construct() {
        $this->batches = [];
        $this->batchCount = 0;
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return DBC
     */
    public function fetchAll($contentTypeName) {
        $len = array_push($this->batches, new DBC($contentTypeName, true,
                                                  ++$this->batchCount, $this));
        return $this->batches[$len - 1];
    }
    /**
     * @param string $contentTypeName
     * @return DBC
     */
    public function fetchOne($contentTypeName) {
        $len = array_push($this->batches, new DBC($contentTypeName, false,
                                                  ++$this->batchCount, $this));
        return $this->batches[$len - 1];
    }
}

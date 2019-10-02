<?php

namespace RadCms\Common;

class Db {
    /**
     * .
     */
    public function fetchAll($query) {
        return '[' .
            '{"pattern":"/art.+","layoutFileName":"article-layout.tmp.php"},' .
            '{"pattern":".*","layoutFileName":"main-layout.tmp.php"}' .
        ']';
    }
}

<?php

namespace RadCms;

class LayoutLookup {
    /**
     * @param string $url
     * @return string
     */
    public function findLayoutFor($url) {
        return [
            '/' => 'main-layout.tmp.php',
            '/art1' => 'article-layout.tmp.php',
            '/art2' => 'article-layout.tmp.php',
        ][$url];
    }
}

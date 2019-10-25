<?php

namespace RadCms\Website;

use RadCms\Framework\GenericArray;

class UrlMatcherCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(UrlMatcher::class);
    }
    /**
     * @param string $url
     * @return string
     */
    public function findLayoutFor($url) {
        foreach ($this->toArray() as $rule) {
            if (preg_match($rule->pattern, $url)) return $rule->layoutFileName;
        }
        return '';
    }
}
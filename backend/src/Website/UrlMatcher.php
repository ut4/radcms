<?php

namespace RadCms\Website;

class UrlMatcher {
    public $pattern;
    public $layoutFileName;
    /**
     * @param string $pattern '.*', '/some-url', '/some-url/[0-9]+'
     * @param string $layoutFileName 'my-file.tmpl.php'
     */
    public function __construct($pattern, $layoutFileName) {
        $this->pattern = '/^' . str_replace('/', '\\/', $pattern) . '$/i';
        $this->layoutFileName = $layoutFileName;
    }
}
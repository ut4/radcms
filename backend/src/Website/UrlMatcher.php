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
        $this->pattern = self::completeRegexp($pattern);
        $this->layoutFileName = $layoutFileName;
    }
    /**
     * @param string $pattern
     * @return string
     */
    public static function completeRegexp($pattern) {
        return '/^' . str_replace('/', '\\/', $pattern) . '$/i';
    }
}

<?php

namespace RadCms;

use RadCms\Template;

class Templating {
    private $basePath;
    /**
     * @param string $basePath = RAD_SITE_PATH
     */
    public function __construct($basePath = RAD_SITE_PATH) {
        $this->basePath = $basePath;
    }
    /**
     * @param string $fileName eg. 'dir/file.php'
     * @param array $locals
     * @param callable $modFn = null Funktio, jolla voi modifioida koodia ennen renderöintiä.
     */
    public function render($fileName, $locals, $modFn = null) {
        $php = file_get_contents($this->basePath . $fileName);
        if ($modFn) $php = $modFn($php);
        return (new Template($php))->render($locals);
    }
}

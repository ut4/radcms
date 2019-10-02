<?php

namespace RadCms;

class Template {
    /**
     * @param string $php
     */
    public function __construct($php) {
        $this->php = $php;
    }
    /**
     * @param array $locals
     * @return string
     */
    public function render($locals) {
        ob_start();
        self::betterEval($this->php, $locals);
        $rendered = ob_get_contents();
        ob_end_clean();
        return $rendered;
    }
    /**
     * https://www.php.net/manual/en/function.eval.php#121190
     *
     * @param string $__code
     * @param array $__locals
     */
    private static function betterEval($__code, $__locals) {
        extract($__locals);
        $__tmp = tmpfile();
        $__tmpf = stream_get_meta_data($__tmp)['uri'];
        fwrite($__tmp, $__code);
        include($__tmpf);
        fclose($__tmp);
    }
}

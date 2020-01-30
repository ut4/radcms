<?php

namespace RadCms\Theme;

class Theme {
    private $api;
    /**
     * @param \RadCms\Theme\API $api
     */
    public function __construct(API $api) {
        $this->api = $api;
    }
    /**
     * @throws \Pike\PikeException
     */
    public function load() {
        $clsPath = 'RadTheme\\Theme';
        if (class_exists($clsPath)) {
            if (!array_key_exists(ThemeInterface::class, class_implements($clsPath, false)))
                throw new PikeException("A theme (\"{$clsPath}\") must implement RadCms\Theme\ThemeInterface",
                                        PikeException::BAD_INPUT);
            $theme = new $clsPath();
            $theme->init($this->api);
        }
    }
}

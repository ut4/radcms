<?php

namespace RadCms\Theme;

use RadCms\BaseAPI;

class Theme {
    /**
     * @param \RadCms\BaseAPI $baseApi
     * @throws \Pike\PikeException
     */
    public function load(BaseAPI $baseApi) {
        $clsPath = 'RadTheme\\Theme';
        if (class_exists($clsPath)) {
            if (!array_key_exists(ThemeInterface::class, class_implements($clsPath, false)))
                throw new PikeException("A theme (\"{$clsPath}\") must implement RadCms\Theme\ThemeInterface",
                                        PikeException::BAD_INPUT);
            $theme = new $clsPath();
            $theme->init($baseApi);
        }
    }
}

<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Templating;

abstract class WebsiteModule {
    /**
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () {
            return new WebsiteControllers(new LayoutLookup(), new Templating());
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if ($method == 'GET') return [$makeCtrl(), 'handlePageRequest'];
        });
    }
}

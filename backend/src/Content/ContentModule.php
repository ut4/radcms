<?php

namespace RadCms\Content;

use RadCms\Content\ContentControllers;

abstract class ContentModule {
    /**
     * Rekisteröi /api/content, ja /api/content-type -alkuiset http-reitit.
     *
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () {
            return new ContentControllers();
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if (strpos($url, '/api/content/') === 0) return [$makeCtrl(), 'handleGetContentNode'];
            if (strpos($url, '/api/content-types/') === 0) return [$makeCtrl(), 'handleGetContentType'];
        });
    }
}

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
        $makeCtrl = function () use ($services) {
            return new ContentControllers($services->db);
        };
        $services->router->map('GET', '/api/content/[i:id]', function () use ($makeCtrl) {
            return [$makeCtrl(), 'handleGetContentNode'];
        });
        $services->router->map('GET', '/api/content-types/[i:id]', function () use ($makeCtrl) {
            return [$makeCtrl(), 'handleGetContentType'];
        });
    }
}

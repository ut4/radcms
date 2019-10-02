<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Templating;

abstract class WebsiteModule {
    /**
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () use ($services){
            return new WebsiteControllers(new LayoutLookup(json_decode($services->db->fetchAll(
                                              'select `layoutMatchers` from [[p]]websiteConfig'
                                          ))),
                                          new Templating());
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if ($method == 'GET') return [$makeCtrl(), 'handlePageRequest'];
        });
    }
}

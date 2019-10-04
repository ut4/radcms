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
            return new WebsiteControllers(new LayoutLookup(json_decode($services->db->fetchOne(
                                              'select `layoutMatchers` from ${p}websiteConfigs'
                                          )['layoutMatchers'])),
                                          new Templating());
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if ($method == 'GET') return [$makeCtrl(), 'handlePageRequest'];
        });
    }
}

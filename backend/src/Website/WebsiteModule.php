<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeCollection;

abstract class WebsiteModule {
    /**
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () use ($services) {
            list ($layoutMatchers, $contentTypes) = self::parseWebsiteState($services->websiteStateRaw);
            return new WebsiteControllers(new LayoutLookup($layoutMatchers),
                                          new DAO($services->db, $contentTypes));
        };
        $services->router->map('GET', '*', function () use ($makeCtrl) {
            return [$makeCtrl(), 'handlePageRequest'];
        });
    }
    /**
     * throws \RuntimeException
     */
    private static function parseWebsiteState($websiteStateRaw) {
        if (!($layoutMatchers = json_decode($websiteStateRaw['layoutMatchers'])))
            throw new \RuntimeException('Failed to parse layoutMatchers');
        if (!($ctypesData = json_decode($websiteStateRaw['activeContentTypes'], true)))
            throw new \InvalidArgumentException('Failed to parse activeContentTypes');
        $ctypes = new ContentTypeCollection();
        foreach ($ctypesData as $single) $ctypes->add(...$single);
        return [$layoutMatchers, $ctypes];
    }
}

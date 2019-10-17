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
            list ($layoutMatchers, $contentTypes) = self::fetchWebsiteState($services->db);
            return new WebsiteControllers(new LayoutLookup($layoutMatchers),
                                          new DAO($services->db, $contentTypes));
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if ($method == 'GET') return [$makeCtrl(), 'handlePageRequest'];
        });
    }
    /**
     * throws \RuntimeException
     */
    private static function fetchWebsiteState($db) {
        $row = $db->fetchOne(
            'select `layoutMatchers`,`activeContentTypes` from ${p}websiteConfigs');
        if (!$row)
            throw new \RuntimeException('Failed to fetch website state');
        if (!($layoutMatchers = json_decode($row['layoutMatchers'])))
            throw new \RuntimeException('Failed to parse layoutMatchers');
        if (!($ctypesData = json_decode($row['activeContentTypes'], true)))
            throw new \InvalidArgumentException('Failed to parse activeContentTypes');
        $ctypes = new ContentTypeCollection();
        foreach ($ctypesData as $single) $ctypes->add(...$single);
        return [$layoutMatchers, $ctypes];
    }
}

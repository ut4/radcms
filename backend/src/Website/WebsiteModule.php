<?php

namespace RadCms\Website;

use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\Framework\NativeSession;

abstract class WebsiteModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/cpanel/[i:dataKey]', function () {
            return [AdminControllers::class, 'handleRenderCpanelRequest'];
        });
        $ctx->router->map('GET', '*', function () use ($ctx) {
            $ctx->injector->delegate(WebsiteControllers::class, function () use ($ctx) {
                list ($layoutMatchers, $contentTypes) = self::parseWebsiteState($ctx->websiteStateRaw);
                return new WebsiteControllers(new LayoutLookup($layoutMatchers),
                                              new DAO($ctx->db, $contentTypes),
                                              new NativeSession(),
                                              $ctx->frontendJsFiles);
            });
            return [WebsiteControllers::class, 'handlePageRequest'];
        });
    }
    /**
     * @throws \RuntimeException
     */
    private static function parseWebsiteState($websiteStateRaw) {
        if (!($layoutMatchers = json_decode($websiteStateRaw['layoutMatchers'])))
            throw new \RuntimeException('Failed to parse layoutMatchers');
        if (!($ctypesData = json_decode($websiteStateRaw['activeContentTypes'], true)))
            throw new \RuntimeException('Failed to parse activeContentTypes');
        $ctypes = new ContentTypeCollection();
        foreach ($ctypesData as $ctypeName => $remainingArgs)
            $ctypes->add($ctypeName, ...$remainingArgs);
        return [$layoutMatchers, $ctypes];
    }
}

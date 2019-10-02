<?php

namespace RadCms;

use RadCms\Router;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Request;

abstract class RadCms {
    /**
     * RadCMS:n entry-point.
     *
     * @param string $path
     */
    public static function handleRequest($path) {
        $services = (object) ['router' => new Router()];
        ContentModule::init($services);
        AuthModule::init($services);
        WebsiteModule::init($services);
        //
        $request = new Request($path);
        $request->user = (object) ['id' => 1];
        $services->router->dispatch($request);
    }
}
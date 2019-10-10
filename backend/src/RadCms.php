<?php

namespace RadCms;

use RadCms\Router;
use RadCms\Common\Db;
use RadCms\Content\ContentModule;
use RadCms\Auth\AuthModule;
use RadCms\Website\WebsiteModule;
use RadCms\Request;

class RadCms {
    public $services;
    /**
     * RadCMS:n entry-point.
     *
     * @param \RadCms\Request $request
     */
    public function handleRequest($request) {
        $request->user = (object) ['id' => 1];
        $this->services->router->dispatch($request);
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array &$config
     */
    public static function create(&$config) {
        $app = new RadCms();
        $app->services = (object) ['router' => new Router(), 'db' => new Db($config)];
        $config = ['wiped' => 'clean'];
        ContentModule::init($app->services);
        AuthModule::init($app->services);
        WebsiteModule::init($app->services);
        return $app;
    }
}

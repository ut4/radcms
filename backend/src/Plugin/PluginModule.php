<?php

namespace RadCms\Plugin;

abstract class PluginModule {
    /**
     * @param object $services
     */
    public static function init($services) {
        $makeCtrl = function () use ($services) {
            return new PluginControllers($services->plugins);
        };
        $services->router->map('GET', '/api/plugins', function () use ($makeCtrl) {
            return [$makeCtrl(), 'handleGetPluginsRequest'];
        });
    }
}

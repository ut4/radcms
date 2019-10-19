<?php

namespace RadCms\Plugin;

abstract class PluginModule {
    /**
     * @param object $services
     */
    public static function init($services) {
        $services->router->map('GET', '/api/plugins', function () {
            return [PluginControllers::class, 'handleGetPluginsRequest'];
        });
        $services->router->map('PUT', '/api/plugins/[w:name]/install', function () {
            return [PluginControllers::class, 'handleInstallPluginRequest'];
        });
        $services->router->map('PUT', '/api/plugins/[w:name]/uninstall', function () {
            return [PluginControllers::class, 'handleUninstallPluginRequest'];
        });
    }
}

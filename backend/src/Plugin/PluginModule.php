<?php

namespace RadCms\Plugin;

abstract class PluginModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/plugins', function () {
            return [PluginControllers::class, 'handleGetPluginsRequest'];
        });
        $ctx->router->map('PUT', '/api/plugins/[w:name]/install', function () {
            return [PluginControllers::class, 'handleInstallPluginRequest'];
        });
        $ctx->router->map('PUT', '/api/plugins/[w:name]/uninstall', function () {
            return [PluginControllers::class, 'handleUninstallPluginRequest'];
        });
    }
}

<?php

namespace RadCms\Plugin;

abstract class PluginModule {
    /**
     * @param object $ctx
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/plugins',
            [PluginControllers::class, 'handleGetPluginsRequest', true]
        );
        $ctx->router->map('PUT', '/api/plugins/[w:name]/install',
            [PluginControllers::class, 'handleInstallPluginRequest', true]
        );
        $ctx->router->map('PUT', '/api/plugins/[w:name]/uninstall',
            [PluginControllers::class, 'handleUninstallPluginRequest', true]
        );
    }
}

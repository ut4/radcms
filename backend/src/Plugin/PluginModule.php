<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use RadCms\AppContext;

abstract class PluginModule {
    /**
     * @param \RadCms\AppContext
     */
    public static function init(AppContext $ctx): void {
        $ctx->router->map('GET', '/api/plugins',
            [PluginControllers::class, 'handleGetPluginsRequest', 'view:plugins']
        );
        $ctx->router->map('PUT', '/api/plugins/[w:name]/install',
            [PluginControllers::class, 'handleInstallPluginRequest', 'install:plugins']
        );
        $ctx->router->map('PUT', '/api/plugins/[w:name]/uninstall',
            [PluginControllers::class, 'handleUninstallPluginRequest', 'uninstall:plugins']
        );
    }
}

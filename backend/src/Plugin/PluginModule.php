<?php

namespace RadCms\Plugin;

abstract class PluginModule {
    /**
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\AppState state, \Pike\Translator translator}
     */
    public static function init($ctx) {
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

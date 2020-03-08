<?php

namespace RadCms\User;

abstract class UserModule {
    /**
     * Rekisteröi /api/users -alkuiset http-reitit.
     *
     * @param \stdClass $ctx {\Pike\Router router, \Pike\Db db, \RadCms\Auth\Authenticator auth, \RadCms\Auth\ACL acl, \RadCms\CmsState cmsState, \Pike\Translator translator}
     */
    public static function init($ctx) {
        $ctx->router->map('GET', '/api/users/me',
            [UserControllers::class, 'handleGetCurrentUser', 'viewItsOwn:profile']
        );
    }
}

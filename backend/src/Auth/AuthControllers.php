<?php

namespace RadCms\Auth;

use RadCms\Framework\Request;
use RadCms\Framework\Response;

class AuthControllers {
    /**
     * .
     */
    public function __construct() {
        //
    }
    /**
     * GET /login.
     *
     * @param \RadCms\Framework\Request $_
     * @param \RadCms\Framework\Response $res
     */
    public function renderLoginView(Request $_, Response $res) {
        $res->send('<label>Käyttäjänimi<input></label>');
    }
}

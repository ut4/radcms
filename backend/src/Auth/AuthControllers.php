<?php

namespace RadCms\Auth;

use RadCms\Request;
use RadCms\Response;

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
     * @param Request $_
     * @param Response $res
     */
    public function renderLoginView(Request $_, Response $res) {
        $res->send('<label>Käyttäjänimi<input></label>');
    }
}

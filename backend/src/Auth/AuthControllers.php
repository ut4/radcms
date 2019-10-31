<?php

namespace RadCms\Auth;

use RadCms\Framework\Request;
use RadCms\Framework\Response;
use RadCms\Framework\Validator;

class AuthControllers {
    private $auth;
    /**
     * @param \RadCms\Auth\Authenticator $auth
     */
    public function __construct(Authenticator $auth) {
        $this->auth = $auth;
    }
    /**
     * GET /login.
     *
     * @param \RadCms\Framework\Request $_
     * @param \RadCms\Framework\Response $res
     */
    public function renderLoginView(Request $_, Response $res) {
        $res->html('<label>Käyttäjänimi<input></label>');
    }
    /**
     * POST /login.
     *
     * @param \RadCms\Framework\Request $req
     * @param \RadCms\Framework\Response $res
     */
    public function handleLoginFormSubmit(Request $req, Response $res) {
        if (($errors = $this->validateLoginFormInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            $this->auth->login($req->body->username,
                               $req->body->password);
            $res->json(['ok' => 'ok']);
        } catch (AuthException $e) {
            $res->status(401)->json(['err' => $e->getMessage()]);
        }
    }
    /**
     * .
     */
    private function validateLoginFormInput($input) {
        $v = new Validator($input);
        //
        $v->check('username', 'present');
        $v->check('password', 'present');
        //
        return $v->errors;
    }
}

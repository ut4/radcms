<?php

namespace RadCms\Auth;

use Pike\Request;
use Pike\Response;
use Pike\Validator;
use Pike\Auth\Authenticator;
use RadCms\Templating\MagicTemplate;
use Pike\PikeException;

class AuthControllers {
    private $auth;
    /**
     * @param \Pike\Auth\Authenticator $auth
     */
    public function __construct(Authenticator $auth) {
        $this->auth = $auth;
    }
    /**
     * GET /login.
     *
     * @param \Pike\Response $res
     */
    public function renderLoginView(Response $res) {
        $res->html((new MagicTemplate(__DIR__ . '/login.tmpl.php'))->render());
    }
    /**
     * POST /login.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
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
        } catch (PikeException $e) {
            $res->status(401)->json(['err' => $e->getMessage()]);
        }
    }
    /**
     * .
     */
    private function validateLoginFormInput($input) {
        $v = new Validator($input);
        //
        $v->check('username', 'nonEmptyString');
        $v->check('password', 'nonEmptyString');
        //
        return $v->errors;
    }
}

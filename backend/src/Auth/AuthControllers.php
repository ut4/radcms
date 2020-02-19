<?php

namespace RadCms\Auth;

use Pike\Request;
use Pike\Response;
use Pike\Validator;
use Pike\Auth\Authenticator;
use RadCms\Templating\MagicTemplate;
use Pike\PikeException;
use RadCms\AppState;

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
        $res->html((new MagicTemplate(__DIR__ . '/base-view.tmpl.php'))
            ->render(['title' => 'Kirjautuminen',
                      'reactAppName' => 'LoginApp']));
    }
    /**
     * POST /api/login.
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
                               $req->body->password,
                               function ($user) {
                                   return (object)['id' => $user->id,
                                                   'role' => $user->role];
                               });
            $res->json(['ok' => 'ok']);
        } catch (PikeException $e) {
            $res->status(401)->json(['err' => $e->getMessage()]);
        }
    }
    /**
     * POST /api/logout.
     *
     * @param \Pike\Response $res
     */
    public function handleLogoutRequest(Response $res) {
        $this->auth->logout();
        $res->json(['ok' => 'ok']);
    }
    /**
     * GET /request-password-reset.
     *
     * @param \Pike\Response $res
     */
    public function renderRequestPassResetView(Response $res) {
        $res->html((new MagicTemplate(__DIR__ . '/base-view.tmpl.php'))
            ->render(['title' => 'Uusi salasanan palautus',
                      'reactAppName' => 'RequestPassResetApp']));
    }
    /**
     * POST /api/request-password-reset.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\AppState $appState
     */
    public function handleRequestPassResetFormSubmit(Request $req,
                                                     Response $res,
                                                     AppState $appState) {
        if (($errors = $this->validateRequestPassResetFormInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
        $this->auth->requestPasswordReset($req->body->usernameOrEmail,
            function ($user, $resetKey, $out) use ($appState) {
                $siteName = $appState->siteInfo->name;
                $siteUrl = $_SERVER['SERVER_NAME'];
                $out->fromAddress = "root@{$siteUrl}";
                $out->fromName = $siteName;
                $out->subject = "[{$siteName}] salasanan palautus";
                $expirationHours = intval(Authenticator::RESET_KEY_EXPIRATION_SECS / 60 / 60);
                $out->body =
                    "Seuraavalle tilille on pyydetty salasanan palautus:\r\n\r\n" .
                    "Sivusto: {$siteName} ({$siteUrl})\r\n" .
                    "Käyttäjä: {$user->username}\r\n\r\n" .
                    "Mikäli et ole pyytänyt uutta salasanaa, voit jättää tämän viestin huomiotta ja poistaa sen jos et halua tehdä mitään. Vaihtaaksesi salasanan, vieraile seuraavassa osoittessa: " .
                    $siteUrl . MagicTemplate::makeUrl("/finalize-password-reset/{$resetKey}") .
                    ". Linkki on voimassa {$expirationHours} tuntia.\r\n";
            });
            $res->json(['ok' => 'ok']);
        } catch (PikeException $e) {
            if ($e->getCode() === Authenticator::INVALID_CREDENTIAL) {
                $res->status(401)->json(['err' => $e->getMessage()]);
            } else {
                throw $e;
            }
        }
    }
    /**
     * GET /finalize-password-reset/[**:key].
     *
     * @param \Pike\Response $res
     */
    public function renderFinalizePassResetView(Response $res) {
        $res->html((new MagicTemplate(__DIR__ . '/base-view.tmpl.php'))
            ->render(['title' => 'Salasanan palautus',
                      'reactAppName' => 'FinalizePassResetApp']));
    }
    /**
     * POST /api/finalize-password-reset.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     */
    public function handleFinalizePassResetFormSubmit(Request $req, Response $res) {
        if (($errors = $this->validateFinalizePassResetFormInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            $this->auth->finalizePasswordReset($req->body->key,
                                               $req->body->email,
                                               $req->body->newPassword);
            $res->json(['ok' => 'ok']);
        } catch (PikeException $e) {
            if ($e->getCode() === Authenticator::INVALID_CREDENTIAL) {
                $res->status(401)->json(['err' => 'Invalid reset key or email']);
            } else {
                throw $e;
            }
        }
    }
    /**
     * @return string[]
     */
    private function validateLoginFormInput($input) {
        $v = new Validator($input);
        $v->check('username', 'nonEmptyString');
        $v->check('password', 'nonEmptyString');
        return $v->errors;
    }
    /**
     * @return string[]
     */
    private function validateRequestPassResetFormInput($input) {
        $v = new Validator($input);
        $v->check('usernameOrEmail', 'nonEmptyString');
        return $v->errors;
    }
    /**
     * @return string[]
     */
    private function validateFinalizePassResetFormInput($input) {
        $v = new Validator($input);
        $v->check('email', 'nonEmptyString');
        $v->check('newPassword', 'nonEmptyString');
        $v->check('key', 'nonEmptyString');
        return $v->errors;
    }
}

<?php

declare(strict_types=1);

namespace RadCms\Auth;

use Pike\Request;
use Pike\Response;
use Pike\AppConfig;
use Pike\Validation;
use Pike\Auth\Authenticator;
use RadCms\Templating\MagicTemplate;
use Pike\PikeException;
use RadCms\CmsState;

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
    public function renderLoginView(Response $res): void {
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
    public function handleLoginFormSubmit(Request $req, Response $res): void {
        if (($errors = $this->validateLoginFormInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            $this->auth->login($req->body->username,
                               $req->body->password,
                               function ($user) {
                                   return (object)['id' => $user->id,
                                                   'role' => (int) $user->role];
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
    public function handleLogoutRequest(Response $res): void {
        $this->auth->logout();
        $res->json(['ok' => 'ok']);
    }
    /**
     * GET /request-password-reset.
     *
     * @param \Pike\Response $res
     */
    public function renderRequestPassResetView(Response $res): void {
        $res->html((new MagicTemplate(__DIR__ . '/base-view.tmpl.php'))
            ->render(['title' => 'Uusi salasanan palautus',
                      'reactAppName' => 'RequestPassResetApp']));
    }
    /**
     * POST /api/request-password-reset.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     * @param \Pike\AppConfig $config
     */
    public function handleRequestPassResetFormSubmit(Request $req,
                                                     Response $res,
                                                     CmsState $cmsState,
                                                     AppConfig $appConfig): void {
        if (($errors = $this->validateRequestPassResetFormInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        try {
            $this->auth->requestPasswordReset($req->body->usernameOrEmail,
                function ($user, $resetKey, $settings) use ($cmsState, $appConfig) {
                    $siteName = $cmsState->getSiteInfo()->name;
                    $siteUrl = $_SERVER['SERVER_NAME'];
                    $settings->useSMTP = $appConfig->get('mail.transport') === 'SMTP';
                    $settings->fromAddress = "root@{$siteUrl}";
                    $settings->fromName = $siteName;
                    $settings->subject = "[{$siteName}] salasanan palautus";
                    $expirationHours = intval(Authenticator::RESET_KEY_EXPIRATION_SECS / 60 / 60);
                    $settings->body =
                        "Seuraavalle tilille on pyydetty salasanan palautus:\r\n\r\n" .
                        "Käyttäjä: {$user->username}\r\n\r\n" .
                        "Sivusto: {$siteName} ({$siteUrl})\r\n" .
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
    public function renderFinalizePassResetView(Response $res): void {
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
    public function handleFinalizePassResetFormSubmit(Request $req,
                                                      Response $res): void {
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
     * POST /update-password.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     */
    public function handleUpdatePasswordRequest(Request $req,
                                                Response $res): void {
        if (($errors = $this->validateUpdatePasswordInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $this->auth->updatePassword($req->body->userId,
                                    $req->body->newPassword);
        $res->json(['ok' => 'ok']);
    }
    /**
     * @return string[]
     */
    private function validateLoginFormInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('username', 'minLength', 1)
            ->rule('password', 'minLength', 1)
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private function validateRequestPassResetFormInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('usernameOrEmail', 'minLength', 1)
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private function validateFinalizePassResetFormInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('email', 'minLength', 1)
            ->rule('newPassword', 'minLength', 1)
            ->rule('key', 'minLength', 1)
            ->validate($input);
    }
    /**
     * @return string[]
     */
    private function validateUpdatePasswordInput(\stdClass $input): array {
        return (Validation::makeObjectValidator())
            ->rule('userId', 'minLength', 36)
            ->rule('newPassword', 'minLength', 1)
            ->validate($input);
    }
}

<?php

namespace RadCms\Auth;

use RadCms\Common\RadException;

/**
 * Auth-moduulin julkinen API: sisältää metodit kuten isLoggedIn() ja login().
 */
class Authenticator {
    public const INVALID_CREDENTIAL  = 201010;
    public const USER_ALREADY_EXISTS = 201011;
    public const FAILED_TO_SEND_MAIL = 201012;
    private $crypto;
    private $services;
    /**
     * @param \RadCms\Auth\Crypto $crypto
     * @param \RadCms\Auth\CachingServicesFactory $factory
     */
    public function __construct(Crypto $crypto, CachingServicesFactory $factory) {
        $this->crypto = $crypto;
        $this->services = $factory;
    }
    /**
     * Palauttaa käyttäjän id:n mikäli käyttäjä on kirjautunut, muutoin null.
     *
     * @return string|null
     */
    public function getIdentity() {
        return $this->services->makeSession()->get('user');
    }
    /**
     * Asettaa käyttäjän $username kirjautuneeksi käyttäjäksi, tai heittää
     * RadExceptionin mikäli käyttäjää ei voitu hakea kannasta tai salasana ei
     * täsmännyt. Olettaa että parametrit on jo validoitu.
     *
     * @param string $username
     * @param string $password
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function login($username, $password) {
        $user = $this->services->makeUserRepo()->getUser($username);
        if (!$user)
            throw new RadException('User not found', self::INVALID_CREDENTIAL);
        if (!$this->crypto->verifyPass($password, $user->passwordHash))
            throw new RadException('Invalid password', self::INVALID_CREDENTIAL);
        $this->services->makeSession()->put('user', $user->id);
        return true;
    }
}
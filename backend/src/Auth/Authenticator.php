<?php

namespace RadCms\Auth;

/**
 * Auth-moduulin julkinen API: sisältää metodit kuten isLoggedIn() ja login().
 */
class Authenticator {
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
     * Asettaa käyttäjän $username kirjautuneeksi käyttäjäksi, tai heittää
     * AuthExceptionin mikäli käyttäjää ei voitu hakea kannasta tai salasana ei
     * täsmännyt. Olettaa että parametrit on jo validoitu.
     *
     * @param string $username
     * @param string $password
     * @throws \RadCms\Auth\AuthException
     */
    public function login($username, $password) {
        $user = $this->services->makeUserRepo()->getUser($username);
        if (!$user)
            throw new AuthException('User not found', AuthException::INVALID_CREDENTIAL);
        if (!$this->crypto->verifyPass($password, $user->passwordHash))
            throw new AuthException('Invalid password', AuthException::INVALID_CREDENTIAL);
        $this->services->makeSession()->put('user', $user->id);
    }
}

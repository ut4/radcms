<?php

declare(strict_types=1);

namespace RadCms\User;

use Pike\Request;
use Pike\Response;

/**
 * Handlaa /api/users -alkuiset pyynnöt.
 */
class UserControllers {
    /**
     * GET /api/users/me: palauttaa kirjautuneen käyttäjän kaikki tiedot lukuun-
     * ottamatta autentikointiin liittyviä tietoja (passwordHash, resetKey jne.).
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\User\UserRepository $userRepo
     */
    public function handleGetCurrentUser(Request $req,
                                         Response $res,
                                         UserRepository $userRepo): void {
        // @allow \Pike\PikeException
        $user = $userRepo->getSingle($req->myData->user->id);
        $res->json($user);
    }
}

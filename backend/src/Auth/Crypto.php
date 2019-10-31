<?php

namespace RadCms\Auth;

final class Crypto {
    /**
     * @param string $plainPass
     * @param string $hashedPass
     * @return bool
     */
    public function verifyPass($plainPass, $hashedPass) {
        return $hashedPass == $plainPass; // todo
    }
}

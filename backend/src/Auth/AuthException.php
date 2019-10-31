<?php

namespace RadCms\Auth;

class AuthException extends \Exception {
    public const INVALID_CREDENTIAL  = 101010;
    public const USER_ALREADY_EXISTS = 101011;
    public const INEFFECTUAL_DB_OP   = 101012;
    public const FAILED_TO_SEND_MAIL = 101013;
}

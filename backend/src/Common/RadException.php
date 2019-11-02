<?php

namespace RadCms\Common;

class RadException extends \RuntimeException {
    public const FAILED_DB_OP      = 101010;
    public const FAILED_FS_OP      = 101011;
    public const BAD_INPUT         = 101012;
    public const INEFFECTUAL_DB_OP = 101013;
}

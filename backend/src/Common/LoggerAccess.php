<?php

namespace RadCms\Common;

use Psr\Log\LoggerInterface;

abstract class LoggerAccess {
    private static $logger;
    /**
     * @return \Psr\Log\LoggerInterface
     */
    public static function getLogger() {
        return self::$logger;
    }
    /**
     * @param \Psr\Log\LoggerInterface $logger
     */
    public static function setLogger(LoggerInterface $logger) {
        self::$logger = $logger;
    }
}

<?php

use Monolog\Logger;
use Monolog\Handler\NullHandler;
use RadCms\Common\LoggerAccess;
use Monolog\Handler\StreamHandler;

require RAD_BASE_PATH . 'vendor/autoload.php';

$logger = new Logger('testEnvLogger');
$logger->pushHandler(new StreamHandler('php://output'));
LoggerAccess::setLogger($logger);

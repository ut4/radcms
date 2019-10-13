<?php

use Monolog\Logger;
use Monolog\Handler\NullHandler;
use RadCms\Common\LoggerAccess;

require dirname(dirname(dirname(__DIR__))) . '/config.php';
require RAD_BASE_PATH . 'vendor/autoload.php';

$logger = new Logger('testEnvLogger');
$logger->pushHandler(new NullHandler());
LoggerAccess::setLogger($logger);

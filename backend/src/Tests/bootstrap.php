<?php

use Monolog\Logger;
use Monolog\Handler\NullHandler;
use RadCms\Common\LoggerAccess;

define('TEST_SITE_PATH', str_replace('\\', '/', __DIR__) . '/_test-site/');

require TEST_SITE_PATH . 'config.php';
$loader = require RAD_BASE_PATH . 'vendor/autoload.php';
$loader->addPsr4('MySite\\', RAD_SITE_PATH);

$logger = new Logger('testEnvLogger');
$logger->pushHandler(new NullHandler());
LoggerAccess::setLogger($logger);

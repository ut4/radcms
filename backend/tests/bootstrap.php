<?php

use Monolog\Logger;
use Monolog\Handler\NullHandler;
use RadCms\Common\LoggerAccess;

error_reporting(E_ALL);
define('TEST_SITE_DIRNAME', '_test-site');
define('TEST_CONFIG_DIR_PATH', str_replace('\\', '/', __DIR__) . '/' .
                               TEST_SITE_DIRNAME . '/');
define('TEST_SITE_PUBLIC_PATH', TEST_CONFIG_DIR_PATH);
define('RAD_BACKEND_PATH', dirname(__DIR__) . '/');

require TEST_CONFIG_DIR_PATH . 'config.php';
$loader = require RAD_BASE_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadCms\\Tests\\', __DIR__);
$loader->addPsr4('RadCms\\Installer\\', RAD_BASE_PATH . 'installer/src');
$loader->addPsr4('RadCms\\Installer\\Tests\\', RAD_BASE_PATH . 'installer/tests');
$loader->addPsr4('RadPlugins\\', dirname(RAD_PUBLIC_PATH) . '/_test-plugins');
$loader->addPsr4('RadSite\\', RAD_PUBLIC_PATH . 'site');

$logger = new Logger('testEnvLogger');
$logger->pushHandler(new NullHandler());
LoggerAccess::setLogger($logger);

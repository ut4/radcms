<?php

use Monolog\Logger;
use Monolog\Handler\NullHandler;
use RadCms\Common\LoggerAccess;

error_reporting(E_ALL);
define('TEST_SITE_DIRNAME', '_test-site');
define('TEST_CONFIG_DIR_PATH', str_replace('\\', '/', __DIR__) . '/' .
                               TEST_SITE_DIRNAME . '/');
define('TEST_SITE_PUBLIC_PATH', TEST_CONFIG_DIR_PATH);

require TEST_CONFIG_DIR_PATH . 'config.php';
$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadCms\\Tests\\', __DIR__);
$loader->addPsr4('RadCms\\Installer\\', RAD_BACKEND_PATH . 'installer/src');
$loader->addPsr4('RadCms\\Installer\\Tests\\', RAD_BACKEND_PATH . 'installer/tests');
$loader->addPsr4('RadCms\\Cli\\', dirname(RAD_BACKEND_PATH) . '/dev-cli/src');
$loader->addPsr4('RadCms\\Cli\\Tests\\', dirname(RAD_BACKEND_PATH) . '/dev-cli/tests');
$loader->addPsr4('RadPlugins\\', RAD_BACKEND_PATH . 'tests/_test-plugins');
$loader->addPsr4('RadSite\\', RAD_WORKSPACE_PATH . 'site');

$logger = new Logger('testEnvLogger');
$logger->pushHandler(new NullHandler());
LoggerAccess::setLogger($logger);

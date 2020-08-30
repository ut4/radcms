<?php

return function (string $dir): void {
error_reporting(E_ALL);
$pluginDir = str_replace('\\', '/', $dir);
define('TEST_SITE_DIRNAME', substr(strrchr($pluginDir, '/'), 1));
define('TEST_CONFIG_DIR_PATH', dirname($pluginDir, 3) . '/');
define('TEST_SITE_PUBLIC_PATH', $pluginDir . '/');
//
$workspacePath = TEST_CONFIG_DIR_PATH;
$publicPath = TEST_SITE_PUBLIC_PATH;
require TEST_CONFIG_DIR_PATH . 'config.php';
//
$loader = require RAD_BACKEND_PATH . 'vendor/autoload.php';
$loader->addPsr4('RadPlugins\\', "{$workspacePath}plugins");
$loader->addPsr4('RadSite\\', TEST_SITE_PUBLIC_PATH . 'my-mock-site');
};